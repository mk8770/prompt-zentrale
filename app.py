"""Tablet dashboard for compiling and updating the master prompt."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "prompts-db.json"
UPDATER = ROOT / "update-prompt.js"
MASTER_ID = "master-prompt"
SECTION_MARKER = "SECTION 4: ACTIVE BUSINESS CATEGORIES"
CATEGORY_LINE = re.compile(r"^Category\s+(\d+):\s+(.+?)\s*$")
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

INDUSTRY_LABELS = {
    "1": "Pub",
    "2": "Cafe",
    "3": "Beauty Salon",
    "4": "Parturi",
    "5": "Dentist",
    "6": "Nail Studio",
    "7": "Restaurant / Pizzeria",
    "8": "Electrician",
    "9": "Physiotherapy",
    "10": "Veterinarian",
    "11": "Locksmith",
    "12": "Massage",
}


def read_database() -> dict:
    if not DB_PATH.is_file():
        raise ValueError(f"Database file not found: {DB_PATH}")
    try:
        raw = DB_PATH.read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise ValueError(f"Could not read {DB_PATH.name}: {exc}") from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"prompts-db.json is not valid JSON: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("prompts"), list):
        raise ValueError('prompts-db.json must be an object with a "prompts" array.')
    return data


def get_master(data: dict) -> dict:
    prompts = data.get("prompts", [])
    master = next(
        (prompt for prompt in prompts if isinstance(prompt, dict) and prompt.get("id") == MASTER_ID),
        None,
    )
    if master is None:
        raise ValueError(f'No prompt with id "{MASTER_ID}" is stored in prompts-db.json.')
    content = master.get("content")
    if not isinstance(content, str) or content.strip() == "":
        raise ValueError(f'"{MASTER_ID}" has no prompt content.')
    return master


def parse_categories(content: str) -> list[dict]:
    categories: list[dict] = []
    current: dict | None = None
    for line in content.splitlines():
        match = CATEGORY_LINE.match(line)
        if match:
            if current is not None:
                categories.append(current)
            current = {
                "number": match.group(1),
                "title": match.group(2).strip(),
                "lines": [line],
            }
            continue
        if current is not None:
            current["lines"].append(line)
    if current is not None:
        categories.append(current)
    return categories


def industry_label(category: dict) -> str:
    return INDUSTRY_LABELS.get(category["number"], category["title"])


def format_updated(timestamp: object) -> str:
    if not isinstance(timestamp, str) or timestamp.strip() == "":
        return ""
    parsed = datetime.fromisoformat(timestamp.strip().replace("Z", "+00:00"))
    return parsed.strftime("%d.%m.%Y - %H:%M Uhr")


def category_block(category: dict) -> str:
    return "\n".join(category["lines"]).strip("\n")


def compile_prompt(master_content: str, category: dict, label: str) -> str:
    if SECTION_MARKER not in master_content:
        raise ValueError(f'The master prompt is missing "{SECTION_MARKER}".')
    core, _marker, _rest = master_content.partition(SECTION_MARKER)
    block = category_block(category)
    selected = (
        "SELECTED BUSINESS CATEGORY\n"
        f"Industry: {label}\n"
        "Build the website for this industry only. Keep every master rule above, "
        "and use the configuration below as the active category.\n\n"
        f"{SECTION_MARKER}\n"
        f"{block}\n"
    )
    return f"{core.rstrip()}\n\n{selected}"


def rule_bullets(instruction: str) -> str:
    if CONTROL_CHARS.search(instruction):
        raise ValueError("The instruction contains control characters that cannot be stored.")
    lines = [re.sub(r"\s+", " ", line).strip() for line in instruction.splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        raise ValueError("Enter an instruction first.")
    for line in lines:
        if CATEGORY_LINE.match(line) or line.startswith("SECTION "):
            raise ValueError("An instruction cannot start a new category or section.")
    return "\n".join(f"- Rule: {line}" for line in lines)


def append_category_rule(content: str, category: dict, instruction: str) -> str:
    raw = category_block(category)
    if content.count(raw) != 1:
        raise ValueError("The selected category block could not be located exactly once.")
    bullets = rule_bullets(instruction)
    return content.replace(raw, f"{raw}\n{bullets}", 1)


def run_update_script(new_content: str) -> dict:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js is required to run update-prompt.js.")
    if not UPDATER.is_file():
        raise RuntimeError(f"Updater not found: {UPDATER}")

    temp_path: Path | None = None
    try:
        handle = tempfile.NamedTemporaryFile(
            prefix="prompt-update-",
            suffix=".md",
            delete=False,
            mode="w",
            encoding="utf-8",
            newline="\n",
        )
        temp_path = Path(handle.name)
        with handle:
            handle.write(new_content)

        command = [
            node,
            str(UPDATER),
            "--id",
            MASTER_ID,
            "--section",
            "content",
            "--updateTextFile",
            str(temp_path),
        ]
        run_kwargs = {
            "cwd": str(ROOT),
            "capture_output": True,
            "text": True,
            "check": False,
        }
        if os.name == "nt":
            run_kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
        completed = subprocess.run(command, **run_kwargs)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)

    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "update-prompt.js failed").strip()
        raise RuntimeError(detail)
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"update-prompt.js returned invalid JSON: {exc}") from exc
    if not payload.get("ok"):
        raise RuntimeError("update-prompt.js did not confirm the save.")
    return payload


def save_category_rule(category_number: str, instruction: str) -> dict:
    master = get_master(read_database())
    categories = parse_categories(master["content"])
    category = next((item for item in categories if item["number"] == category_number), None)
    if category is None:
        raise ValueError(f"Category {category_number} is no longer in the master prompt.")
    updated = append_category_rule(master["content"], category, instruction)
    return run_update_script(updated)


def copy_button(text: str) -> None:
    payload = json.dumps(text).replace("<", "\\u003c")
    st.iframe(
        f"""
        <style>
          html, body {{
            margin: 0;
            background: transparent;
            font-family: "Segoe UI", sans-serif;
          }}
          button {{
            width: 100%;
            min-height: 48px;
            border: 0;
            border-radius: 12px;
            background: #79A7FF;
            color: #0C0F14;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          }}
          button:active {{
            transform: translateY(1px);
          }}
        </style>
        <button id="copy" type="button">Copy to Clipboard</button>
        <script>
          const text = {payload};
          const button = document.getElementById("copy");
          button.addEventListener("click", async () => {{
            try {{
              await navigator.clipboard.writeText(text);
            }} catch (err) {{
              const area = document.createElement("textarea");
              area.value = text;
              document.body.appendChild(area);
              area.select();
              document.execCommand("copy");
              area.remove();
            }}
            button.textContent = "Copied";
            setTimeout(() => {{ button.textContent = "Copy to Clipboard"; }}, 1600);
          }});
        </script>
        """,
        height=56,
    )


def inject_styles() -> None:
    st.markdown(
        """
        <style>
          .block-container {
            max-width: 1100px;
            padding-top: 1.4rem;
            padding-bottom: 3rem;
          }
          .stButton > button {
            min-height: 48px;
            border-radius: 12px;
            font-weight: 650;
          }
          div[data-testid="stCode"] pre {
            max-height: 52vh;
            overflow: auto;
            border-radius: 12px;
          }
          textarea {
            font-size: 1rem !important;
          }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_industry_tabs(categories: list[dict]) -> dict:
    if "industry" not in st.session_state:
        st.session_state.industry = categories[0]["number"]
    if st.session_state.industry not in {item["number"] for item in categories}:
        st.session_state.industry = categories[0]["number"]

    st.markdown("#### Industries")
    per_row = 3
    for start in range(0, len(categories), per_row):
        columns = st.columns(per_row)
        for offset, column in enumerate(columns):
            index = start + offset
            if index >= len(categories):
                continue
            category = categories[index]
            label = industry_label(category)
            selected = category["number"] == st.session_state.industry
            with column:
                if st.button(
                    label,
                    key=f"industry-{category['number']}",
                    type="primary" if selected else "secondary",
                    width="stretch",
                ):
                    st.session_state.industry = category["number"]
                    st.rerun()

    return next(item for item in categories if item["number"] == st.session_state.industry)


def main() -> None:
    st.set_page_config(
        page_title="Prompt Zentrale",
        page_icon="PZ",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    inject_styles()

    try:
        master = get_master(read_database())
        categories = parse_categories(master["content"])
    except ValueError as exc:
        st.error(str(exc))
        st.stop()

    if not categories:
        st.error("The master prompt does not contain any Category blocks.")
        st.stop()

    with st.sidebar:
        st.header("Prompt Zentrale")
        st.caption("Tablet developer desk")
        st.write("**Record**")
        st.code(MASTER_ID, language="text")
        st.write("**Version**")
        st.code(str(master.get("version", "")), language="text")
        st.write("**Updated**")
        st.code(format_updated(master.get("lastUpdated", "")), language="text")
        st.divider()
        st.caption(
            "Update Prompt appends the instruction to the selected industry "
            "and saves it through update-prompt.js."
        )

    st.title("Prompt Zentrale")
    st.caption("Select an industry, copy the compiled English prompt, or append a new rule.")

    flash = st.session_state.pop("flash", None)
    if flash:
        st.success(flash)
    if len(categories) != 12:
        st.warning(f"Expected 12 industries in the master prompt. Found {len(categories)}.")

    selected = render_industry_tabs(categories)
    label = industry_label(selected)
    try:
        compiled = compile_prompt(master["content"], selected, label)
    except ValueError as exc:
        st.error(str(exc))
        st.stop()

    version_col, industry_col, count_col = st.columns(3)
    version_col.metric("Version", str(master.get("version", "")))
    industry_col.metric("Industry", label)
    count_col.metric("Stored categories", len(categories))

    heading_col, copy_col = st.columns([3, 1])
    with heading_col:
        st.subheader("Compiled prompt")
        st.caption(f"{selected['title']} injected into the master-prompt rules.")
    with copy_col:
        copy_button(compiled)
    st.code(compiled, language="markdown")

    st.divider()
    instruction_key = st.session_state.setdefault("instruction_key", 0)
    instruction = st.text_area(
        "Instruct AI to modify this Category",
        key=f"instruction-{instruction_key}",
        height=140,
        placeholder="Example: Keep the hero headline short and mention a Friday acoustic set.",
    )
    if st.button("Update Prompt", type="primary", width="stretch"):
        if not instruction or instruction.strip() == "":
            st.warning("Enter an instruction first.")
        else:
            try:
                result = save_category_rule(selected["number"], instruction)
            except (ValueError, RuntimeError, OSError) as exc:
                st.error(str(exc))
            else:
                st.session_state.flash = (
                    f"Appended the rule to {label}. "
                    f"{result['id']} is now version {result['version']}."
                )
                st.session_state.instruction_key = instruction_key + 1
                st.rerun()


if __name__ == "__main__":
    main()
