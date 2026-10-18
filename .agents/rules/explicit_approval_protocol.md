# Explicit Approval Before Code Edits Protocol

## Objective
The user requires an interactive discussion workflow before any code modification or implementation takes place. The user prefers to review how the assistant understands their request and align on logic adjustments before any code is written.

## Mandatory Rules for Every Session / Request:
1. **Never Touch Code First**:
   - When a user submits a prompt, bug report, issue, or feature request: **NEVER immediately edit, write, or replace code**.
   - Do NOT call `replace_file_content`, `multi_replace_file_content`, or `write_to_file` on project code files during the initial analysis turn.
2. **Present Clear Explanation & Logic Plan**:
   - Explain your understanding of the user's intent and problem statement.
   - Detail the root cause (for bugs) or proposed architecture/logic design (for new features/updates).
   - Outline the specific adjustments planned, giving the user space to critique, adjust, or correct any misplaced assumptions.
3. **Await Explicit Consent**:
   - End the analysis by asking for confirmation or feedback.
   - Only execute code changes once the user gives an explicit command to proceed (e.g., *"lanjutkan"*, *"oke proceed"*, *"lanjut ubah kode"*, *"terapkan"*).
4. **Autonomous Execution Until Fully Finished**:
   - Once the user gives the explicit green light, execute all necessary file changes, compile, and run typecheck/verification completely until done without pausing in the middle to ask further trivial questions.

