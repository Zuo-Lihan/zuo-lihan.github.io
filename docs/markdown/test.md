---
slug: paper-reading
title: My Research Paper Reading List for Vector-Steering
eyebrow: Docs / LLM / Papers / Vector Steering
summary: A paper reading list for my research on Vector-Steering.
tags: LLM, Inference, paper-reading, Vector-Steering
---

## Reading List: 1
| Title | Conference | Key contents | Paper / Code |
|---|---|---|---|
| **Inference-Time Intervention: Eliciting Truthful Answers from a Language Model** | NeurIPS 2023 | ITI：找到与真实性相关的 attention heads，在推理时向其激活加入 truth direction。非常经典。 | [论文](https://proceedings.neurips.cc/paper_files/paper/2023/hash/81b8390039b7302c909cb769f8b6cd93-Abstract-Conference.html) · [GitHub](https://github.com/likenneth/honest_llama) |
| **Function Vectors in Large Language Models** | ICLR 2024 | 研究模型内部是否存在表示任务/函数的向量，并用 activation injection 触发任务行为。机制解释价值很高。 | [论文](https://proceedings.iclr.cc/paper_files/paper/2024/hash/4ae163cb8788970e53b4fd9578141139-Abstract-Conference.html) · [GitHub](https://github.com/ericwtodd/function_vectors) |
| **Steering Llama 2 via Contrastive Activation Addition** | ACL 2024 | CAA：正负样本激活均值作差得到 steering vector，几乎是当前 activation steering 的标准 baseline。 | [论文](https://aclanthology.org/2024.acl-long.828/) · [GitHub](https://github.com/nrimsky/CAA) |
| **In-context Vectors: Making ICL More Effective and Controllable Through Latent Space Steering** | ICML 2024 | 把 demonstrations 压缩为 latent vector；研究 ICL、任务向量与向量算术。 | [论文](https://proceedings.mlr.press/v235/liu24bx.html) · [GitHub](https://github.com/shengliu66/ICV) |
| **Analysing the Generalisation and Reliability of Steering Vectors** | NeurIPS 2024 | 系统研究 steering vector 的跨数据、跨行为泛化以及副作用。做研究时必须读，避免只报告正面案例。 | [论文](https://proceedings.neurips.cc/paper_files/paper/2024/hash/fb3ad59a84799bfb8d700e56d19c231b-Abstract.html) · [GitHub](https://github.com/dtch1997/steering-bench) |
| **Spectral Editing of Activations for Large Language Model Alignment** | NeurIPS 2024 | SEA：不再只使用简单均值差，而是用正负样本间的协方差结构构造投影。 | [论文](https://proceedings.neurips.cc/paper_files/paper/2024/hash/684c59d614fe6ae74a3be8c3ef07e061-Abstract-Conference.html) · [GitHub](https://github.com/yfqiu-nlp/sea-llm) |

## 2026 Worth-reading Paper List: 2
| Title | Conference | Insights | Paper / Code |
|---|---|---|---|
| **Fine-Grained Activation Steering: Steering Less, Achieving More** | ICLR 2026 | 不再整层统一加入向量，而是定位细粒度的 atomic units，只干预真正有关的部分。 | [论文](https://proceedings.iclr.cc/paper_files/paper/2026/hash/423d0909791493b7c10916fd328c2913-Abstract-Conference.html) · [GitHub](https://github.com/zijian678/AUSteer) |
| **Activation Steering with a Feedback Controller** | ICLR 2026 | 把静态 steering 解释为比例控制器，并引入反馈/PID 式动态控制，解决固定强度容易过度 steering 的问题。 | [论文](https://proceedings.iclr.cc/paper_files/paper/2026/hash/fa5617c176e76fee83f3f9947fdf9f3f-Abstract-Conference.html) · [GitHub](https://github.com/dungnvnus/pid-steering) |
| **COLD-Steer: Steering LLMs via In-Context One-Step Learning Dynamics** | ICLR 2026 | 从 in-context learning 的一步更新动态构造 steering，重点解决新目标与少样本适应。 | [论文](https://proceedings.iclr.cc/paper_files/paper/2026/hash/2ee1c87245956e3eaa71aaba5f5753eb-Abstract-Conference.html) · [GitHub](https://github.com/Ksartik/cold-steer) |
| **Spherical Steering: Geometry-Aware Activation Rotation for Language Models** | ICML 2026 | 认为简单向量加法破坏 activation 的几何结构，改用球面旋转进行控制。 | [论文](https://proceedings.mlr.press/v306/you26a.html) · [GitHub](https://github.com/chili-lab/Spherical-Steering) |

## Proposed Reading Papers
- Improving Instruction-Following through Activation Steering
- Function Vectors
- In-context Vectors
- CAA
- Generalisation and Reliability of Steering Vectors
- AxBench
- Activation Steering with a Feedback Controller
