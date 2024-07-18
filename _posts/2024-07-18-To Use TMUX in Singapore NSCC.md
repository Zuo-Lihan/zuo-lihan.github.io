---
layout:  post
title:  Use of TMUX on Singapore NSCC-aspire2a
subtitle:  About TMUX usages, to see from part-3 is better
date:  2024-07-18
author:  ZLH
header-img:    img/post-TMUX_usages.jpg
catalog:  true
tags:
    -  NSCC
    -  TMUX
---

# Use TMUX in NSCC aspire2a

## 1. To Check the TMUX Version
   
-       tmux -V

  ![image](https://github.com/user-attachments/assets/fbe68606-fec0-4242-9565-fc447893cdb9)

## 2. To Enter the TMUX Session

-      tmux

  ![image](https://github.com/user-attachments/assets/13299d6b-1dd3-45cf-ac20-f5dafe1a24ce)

## 3. Some Basic Usage for TMUX Use

### 3.1 create a new session:

-      tmux new -s [session-name]

### 3.2 exit the current session to the terminal:

-    `ctrl+b d`

### 3.3 check the TMUX session list:

-      tmux ls

  ![image](https://github.com/user-attachments/assets/ba134036-d698-431c-987a-6b79c66d3ed2)

### ***3.4 to check TMUX session list while in one session window:***

-   `ctrl+b s`

### 3.5 enter a session:

-      tmux a -t [session-name]

### 3.6 destroy a session:

-      tmux kill-session -t [session-name]

### 3.7 rename a session:

-      tmux rename -t [old session-name] [new session-name]

## 4. About TMUX Windows Usage
A TMUX session can have multiple Windows, and each window can be divided into multiple panes. The smallest unit we work in is actually the pane. By default, in a window, there is only one large pane that occupies the entire window area. We work in this area.

### 4.1 create a new pane:

-   `ctrl+b c`

### 4.2 switch windows:

- `ctrl+b p`: switch to the previous one window;
- `ctrl+b n`: switch to the next one window;
- `ctrl+b [index]`: switch to the corresponding [index] window;
- `ctrl+b w`: list all windows of this session;
- `ctrl+b l`: switch between the contiguous windows;

  ![image](https://github.com/user-attachments/assets/d2eb3307-a6d3-4a2d-8e0f-78241ce300bd)

### 4.3 `ctrl+b &`: to kill a window bash

### 5. About TMUX Panes Usage

-  `ctrl+b %`: split screen panes of vertical type;
-  `ctrl+b "`: split screen panes of level type;
  
---

-  `ctrl+b o`: switch panes under the current window in turn;
-  `ctrl+b <UP>|<Down>|<Left>|<Right>`: switch to a pane by selecting the arrow direction;
-  `ctrl+b <Space>`: rearrange the layout of all panes under the current window, changing styles each time you enter this command;
-  `ctrl+b z`: maximize the current pane, and press again to resume;

### 6. `ctrl+b x`: delete the pane currently in use.


