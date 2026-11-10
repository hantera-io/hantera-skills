# Hantera skills

Reusable [Agent Skills](https://agentskills.io/) for people who build on and maintain Hantera. Each skill is self-contained under `skills/` and can be installed separately in compatible agents.

## Available skills

| Skill | Use it for |
| --- | --- |
| [hantera-dev-skill](skills/hantera-dev-skill/SKILL.md) | Managing tenant resources and building Hantera apps, including Filtrera, the CLI, MCP, payments, sales channels and promotion mirroring. |

The integration guides are adaptable design patterns, not complete provider implementations. Verify the target tenant and provider contracts, security and commercial semantics, and test in a dedicated development tenant before deployment.

## Install a skill

Clone or download this repository. Copy the **individual** `skills/hantera-dev-skill/` directory, including `SKILL.md`, `references/` and `assets/`, to one of the supported locations below. The destination folder must be named `hantera-dev-skill`.

Project paths are relative to the project where the agent works, not this repository. Personal paths use your home directory. A copied skill is a snapshot: update it when the source changes. Don't overwrite an existing installation without checking it first.

| Agent | Project skill directory | Personal skill directory | Use |
| --- | --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/skills.md) | `.claude/skills/hantera-dev-skill/` | `~/.claude/skills/hantera-dev-skill/` | Ask for the task or invoke `/hantera-dev-skill`. |
| [OpenAI Codex](https://developers.openai.com/codex/skills.md) | `.agents/skills/hantera-dev-skill/` | `~/.agents/skills/hantera-dev-skill/` | Use `/skills` or mention `$hantera-dev-skill`. |
| [GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills) | `.github/skills/hantera-dev-skill/` | `~/.copilot/skills/hantera-dev-skill/` | Ask in agent chat or select `/hantera-dev-skill`. Other Copilot surfaces can differ; see [GitHub's skill locations](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills). |
| [Cline](https://docs.cline.bot/customization/skills.md) | `.cline/skills/hantera-dev-skill/` | `~/.cline/skills/hantera-dev-skill/` | Select `/hantera-dev-skill` or ask for a Hantera development task. |
| [Cursor](https://cursor.com/docs/context/skills) | `.cursor/skills/hantera-dev-skill/` or `.agents/skills/hantera-dev-skill/` | `~/.cursor/skills/hantera-dev-skill/` or `~/.agents/skills/hantera-dev-skill/` | Select `/hantera-dev-skill` in agent chat. |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/) | `.gemini/skills/hantera-dev-skill/` or `.agents/skills/hantera-dev-skill/` | `~/.gemini/skills/hantera-dev-skill/` or `~/.agents/skills/hantera-dev-skill/` | Run `/skills list`, then ask the agent to use the skill; `/skills reload` refreshes discovery. |
| [Google Antigravity](https://antigravity.google/docs/skills) | `.agents/skills/hantera-dev-skill/` | `~/.gemini/config/skills/hantera-dev-skill/` | Invoke `/hantera-dev-skill` or ask for a relevant task. |
| [OpenCode](https://opencode.ai/docs/skills/) | `.opencode/skills/hantera-dev-skill/` | `~/.config/opencode/skills/hantera-dev-skill/` | Mention `@hantera-dev-skill`. Its documented compatibility locations include `.agents/skills/` and `.claude/skills/`. |

Agents can also select the skill automatically when a request matches its description. If it doesn't appear, start a new session or use the agent's reload command, check that skills are enabled, and check for duplicate installations. Agent versions and discovery rules change; consult the linked documentation for your surface.

### Copy example: project installation

From the repository root, with the target project supplied as an absolute path, this POSIX shell example installs the skill for Cline. Substitute a directory from the table for another agent:

```bash
SKILL_SOURCE="$(pwd)/skills/hantera-dev-skill"
PROJECT_ROOT="/absolute/path/to/your/project"
DESTINATION="$PROJECT_ROOT/.cline/skills/hantera-dev-skill"
mkdir -p "$PROJECT_ROOT/.cline/skills"
if [ -e "$DESTINATION" ] || [ -L "$DESTINATION" ]; then
  echo "Destination already exists: $DESTINATION" >&2
else
  cp -R "$SKILL_SOURCE" "$DESTINATION"
fi
```

On Windows PowerShell, the equivalent project installation is:

```powershell
$skillSource = (Resolve-Path '.\skills\hantera-dev-skill').Path
$projectRoot = 'C:\path\to\your\project'
$skillsDirectory = Join-Path $projectRoot '.cline\skills'
$destination = Join-Path $skillsDirectory 'hantera-dev-skill'
if (Test-Path -LiteralPath $destination) {
  throw "Destination already exists: $destination"
}
New-Item -ItemType Directory -Path $skillsDirectory -Force | Out-Null
Copy-Item -LiteralPath $skillSource -Destination $destination -Recurse
```

For local development, a directory symlink can keep the installed skill in sync with the checkout. Codex explicitly supports symlinked skill directories; verify other agents and filesystems individually. Windows may require Developer Mode or elevated privileges to create a symbolic link. For a portable shared project or a cloud agent, prefer copying the skill into the repository: a link to a local checkout is not available in another environment.

### Claude web and desktop

Claude custom skills are uploaded as a ZIP containing the **skill folder** at its root, not the whole repository. From the repository root:

```bash
(cd skills && zip -r ../hantera-dev-skill.zip hantera-dev-skill)
```

On Windows PowerShell, the equivalent is:

```powershell
Compress-Archive -Path '.\skills\hantera-dev-skill' -DestinationPath '.\hantera-dev-skill.zip'
```

The archive should contain `hantera-dev-skill/SKILL.md`, `hantera-dev-skill/references/` and `hantera-dev-skill/assets/`, not the repository README or `.git`. Before archiving, make sure no local settings, packages, traces or other generated files have been added to the skill folder. In Claude, enable code execution if required, then use **Customize → Skills → + → Create skill → Upload a skill** and select the ZIP. Organization policies can restrict uploads. See [Claude's skill instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).

## Hantera access and safety

The skill is guidance, not a tenant connection. Install the [Hantera CLI](https://developer.hantera.io/learn/hantera-cli.md) and connect an authorized [Hantera MCP server](https://developer.hantera.io/learn/model-context-protocol.md) when the task needs them. Confirm the selected tenant before any write. Development sessions, tests and integrations can change real resources or call external systems; use a dedicated development tenant and sandbox provider. Never place secrets in the skill or repository.

## Maintaining skills

- Keep each `SKILL.md` focused and link to relevant files under its own `references/` directory.
- Prefer current public Hantera documentation and tenant-discovered contracts. Don't require internal repositories or include customer data, credentials, private URLs or unreleased implementation details.
- Validate skill metadata, relative links and representative agent discovery after changes. Exercise runnable examples safely and document untested behavior.