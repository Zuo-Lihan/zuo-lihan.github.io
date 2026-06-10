---
slug: tmux-nscc
title: TMUX on Singapore NSCC Aspire2A
eyebrow: IHPC(A*STAR) / NSCC / TMUX
summary: A research-computing note rewritten from the original TMUX blog source. The aim is simple: keep long-running remote experiments alive, inspect sessions cleanly, and make HPC work easier to resume after network interruption.
image: img/post-TMUX_usages.jpg
tags: Session Persistence, Window and Pane Control, Experiment Logging
---

## Why This Doc Exists

On NSCC Aspire2A, remote sessions can be interrupted while training or evaluation jobs are still meaningful. TMUX creates a durable terminal layer before queue allocation and experiment launch.

The operating habit is straightforward: create the TMUX session first, then request resources, load modules, activate the environment, and launch the experiment with logs.

## Core Workflow

```bash
tmux -V
tmux new -s [session_name]
```

Detach from the current TMUX session without killing it:

```text
ctrl+b d
```

Reattach to a named session:

```bash
tmux a -t [session_name]
```

## Session Commands

- Create a new session: `tmux new -s [session_name]`
- Detach from the current session: `ctrl+b d`
- List sessions from the shell: `tmux ls`
- List sessions from inside TMUX: `ctrl+b s`
- Enter a named session: `tmux a -t [session_name]`
- Rename a session: `tmux rename -t [old_session] [new_session]`
- Kill a session: `tmux kill-session -t [session_name]`

Use explicit session names so collaborators and future-you can recognize which experiment is attached to which terminal state.

## Windows and Panes

A TMUX session can contain multiple windows. Each window can be split into panes. This is useful for keeping logs, monitors, scripts, and notes visible without opening multiple SSH sessions.

### Windows

- Create a new window: `ctrl+b c`
- Switch to the previous window: `ctrl+b p`
- Switch to the next window: `ctrl+b n`
- Switch to a window by index: `ctrl+b [index]`
- List all windows: `ctrl+b w`
- Switch between contiguous windows: `ctrl+b l`
- Kill a window: `ctrl+b &`

### Panes

- Split vertically: `ctrl+b %`
- Split horizontally: `ctrl+b "`
- Move through panes: `ctrl+b o`
- Select a pane by direction: `ctrl+b [arrow]`
- Rearrange pane layout: `ctrl+b Space`
- Maximize or restore the current pane: `ctrl+b z`
- Delete the current pane: `ctrl+b x`

## NSCC Experiment Launch

The original note records this sequence for Aspire2A-style interactive work. Adjust queue, project name, walltime, memory, GPU count, environment, and script paths for each actual experiment.

```bash
tmux new -s [session_name]

qsub -I -l select=1:ncpus=5:mem=50gb:ngpus=1,walltime=36:00:00 -q normal -P personal-lihanzuo -N Alpaca_ATTN

module load miniforge3
conda activate [my_env]

nohup bash [my_python.sh] > log/output_[my_python_name].log 2>&1 &
```

If logging is not needed for a quick run, route output to `/dev/null`. For research experiments, keeping logs is usually the better default.

```bash
nohup bash [my_python.sh] > /dev/null 2>&1 &
```

## Research-Computing Checklist

- Start TMUX before requesting compute resources.
- Keep session names descriptive.
- Put logs under a predictable `log/` directory.
- Keep the environment activation command near the launch command.
- Detach intentionally before leaving the SSH session.
- Reattach and inspect logs before assuming a job failed.
