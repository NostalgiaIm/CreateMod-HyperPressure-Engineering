# Create: HyperPressure Engineering

HyperPressure Engineering 是一个早期开发中的 Create 附属模组，主题是高压流体、压缩空气、压力仪表、高压合金，以及可控但有风险的工程系统。

英文版 [README.md](README.md) 是项目主要展示文档；本文件用于中文开发说明。

## 当前状态

本仓库已经不是纯空骨架，而是一个可以继续扩展的 NeoForge/Create 附属模组基础工程。完整气压网络还没有完成，但第一层玩法内容已经开始落地。

已经实现或搭建的内容：

- NeoForge 模组入口与注册结构。
- 面向 Minecraft `1.21.1` 的 Create/NeoForge Gradle 配置。
- 手摇柱塞泵方块、方块实体、渲染器、资产、方块模型与物品模型。
- 自定义手摇泵加压配方类型与序列化器。
- 压力护目镜、超级工程师护目镜，以及可穿戴模型资产。
- 高压合金、强化高压合金、共振合金、超压合金、致密超压板等材料链。
- 当前内容对应的配方、标签、进度、英文/中文语言文件、贴图与模型资源。

后续计划系统：

- 服务端权威的压力与气动网络模拟。
- 空压机、压力罐、阀门、管道、安全泄压装置和超压失效行为。
- 压力表、红石控制、HUD 读数，以及 Create 风格的科技线推进。
- 与 Create 应力、转速、机械加工流程更深的联动。

## 环境要求

- Java `21`
- Minecraft `1.21.1`
- NeoForge `21.1.219`
- Create `6.0.11`
- Registrate `MC1.21-1.3.0+67`
- Ponder `1.0.82`
- Flywheel `1.0.6`

请使用本项目自带的 Gradle Wrapper，并把 IntelliJ IDEA 的 Project SDK 与 Gradle JVM 都设置为 JDK 21。

## 启动方式

克隆仓库后，用 IntelliJ IDEA 以 Gradle 项目打开，然后运行以下命令：

```powershell
.\gradlew.bat --version
.\gradlew.bat runClient
.\gradlew.bat runServer
.\gradlew.bat build
```

当前 Gradle Wrapper 已配置为从华为云镜像下载 Gradle，可以缓解 `services.gradle.org` 无法访问或下载超时的问题。

## Create 依赖说明

Create 依赖体积较大，网络不稳定时可能出现类似错误：

```text
Premature end of Content-Length delimited message body
```

本项目解析 Create 依赖时会按以下顺序查找：

1. `libs/create-1.21.1-6.0.11.jar` 中完整的本地 jar。
2. 通过 `mavenLocal()` 查找本机 Maven 仓库。
3. 远程 Maven 仓库。

如果你把 Create 源码仓库放在本项目旁边，推荐先把它发布到 Maven 本地仓库：

```powershell
cd ..\Create
.\gradlew.bat publishToMavenLocal
cd "..\Create-HyperPressure Engineering"
.\gradlew.bat runClient
```

不要提交 Create 官方 jar。`libs/*.jar` 已经在 `.gitignore` 中排除。

## 项目结构

```text
src/main/java/com/kaifa/hyperpressure/
  HyperPressure.java              模组入口
  registry/                       方块、物品、配方、创造模式标签页、方块实体注册
  content/handpump/               手摇柱塞泵与加压配方逻辑
  content/equipment/              压力护目镜与压力显示接口
  content/materials/              压力合金物品行为
  client/                         客户端初始化与可穿戴模型代码

src/main/resources/
  META-INF/neoforge.mods.toml     NeoForge 模组元数据
  assets/hyperpressure/           方块状态、模型、贴图、语言文件
  data/hyperpressure/             配方、标签、进度
  data/create/                    Create 兼容标签
  data/curios/                    头部装备槽兼容标签

tools/                            资产生成辅助脚本
gradle/                           Gradle Wrapper 文件
build.gradle                      NeoForge/Create 构建配置
gradle.properties                 版本号与模组元数据
```

构建输出、运行目录、IDE 元数据、本地 jar、生成资源和计划文档都会被忽略。

## 架构方向

项目目前按 `content/` 下的功能包组织具体玩法代码，并把方块、物品、配方、标签页、方块实体等注册集中放在 `registry/` 中。这样后续扩展气压网络、机器、装备和材料时，不会把注册、模拟、渲染、数据文件混在一起。

压力系统后续应优先做成服务端权威模拟。所有储压、传压、耗压方块都应通过窄接口表达容量、流量限制、介质类型、泄压阈值和失效阈值。客户端渲染器与 HUD 只读取同步状态，不直接决定玩法结果。Create 联动也应保持边界清晰：动力输入、加工配方、护目镜显示、Ponder 教程和红石行为分别通过独立适配层接入。

## 参与贡献

这是一个开源的 Create 附属模组项目，欢迎参与贡献。适合参与的方向包括：压力网络设计、Create 动力系统联动、方块与机器实现、HUD/护目镜显示、数值平衡、配方、贴图、模型、Ponder 教程、本地化和文档。

如果要做比较大的改动，建议先开 issue 或 discussion，说明目标玩法和预期行为。提交时请尽量保持改动聚焦，不要提交构建产物或本地依赖 jar；涉及代码或生成资源时，建议用 JDK 21 做一次本地验证。

## 许可证

本项目定位为开源项目。当前 `LICENSE` 文件仍是早期占位声明，正式公开发布前需要替换为最终采用的开源许可证。
