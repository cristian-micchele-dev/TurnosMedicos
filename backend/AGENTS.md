<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("npx agent-skills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- IMPORTANT: Always cd to the Base Directory shown in output before executing scripts or accessing bundled resources

Usage notes:
- For project-specific tasks, only use skills listed in <available_skills> below
- Note: Native capabilities (e.g., via the Skill tool) remain available alongside project skills
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>security-audit</name>
<description>Use when conducting security assessments — OWASP Top 10 / API / LLM, CWE Top 25, CVSS scoring — auditing PHP/TYPO3, APIs, frontend, Terraform/K8s/Docker IaC, AWS cloud, AI agent configs, or scanning dependencies.</description>
<location>C:/Users/Cristian/Desktop/CursoOpenCode/Turno de Medicos/backend/node_modules/@netresearch/security-audit-skill/skills/security-audit</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
