# Create: HyperPressure Engineering

HyperPressure Engineering is an early-stage Create addon about high-pressure fluids, compressed air, pressure instruments, advanced pressure alloys, and controllable engineering risk.

English is the primary project README. A Chinese version is available at [README.zh-CN.md](README.zh-CN.md).

## Current Status

This repository is a working NeoForge/Create addon scaffold with the first gameplay layer already started. It is not a finished pressure-network mod yet.

Implemented or scaffolded content:

- NeoForge mod entrypoint and registry structure.
- Create/NeoForge Gradle setup for Minecraft `1.21.1`.
- Hand-Cranked Plunger Pump block, block entity, renderer, assets, and block/item models.
- Custom hand-pump pressurizing recipe type and serializer.
- Pressure Goggles and Super Engineer's Goggles item classes and wearable model assets.
- High-Pressure Alloy, Reinforced High-Pressure Alloy, Resonant Alloy, Ultra-Pressure Alloy, and Dense Ultra-Pressure Plate.
- Recipes, tags, advancements, English/Chinese language files, and texture/model assets for the current content.

Planned systems:

- Server-authoritative pressure and pneumatic network simulation.
- Compressors, pressure tanks, valves, pipes, safety vents, and overload behavior.
- Pressure gauges, redstone control, HUD readouts, and Create-style progression.
- Expanded kinetic integration with Create stress, rotation speed, and machine processing.

## Requirements

- Java `21`
- Minecraft `1.21.1`
- NeoForge `21.1.219`
- Create `6.0.11`
- Registrate `MC1.21-1.3.0+67`
- Ponder `1.0.82`
- Flywheel `1.0.6`

Use this repository's Gradle Wrapper and set both the IDE Project SDK and Gradle JVM to JDK 21.

## Getting Started

Clone the repository, open it in IntelliJ IDEA as a Gradle project, and run one of the Gradle tasks below:

```powershell
.\gradlew.bat --version
.\gradlew.bat runClient
.\gradlew.bat runServer
.\gradlew.bat build
```

The Gradle wrapper is configured to download Gradle from the Huawei Cloud mirror. This helps on networks where `services.gradle.org` is unstable or unavailable.

## Create Dependency Notes

Create is large, and interrupted downloads can produce errors such as:

```text
Premature end of Content-Length delimited message body
```

The build checks dependency sources in this order:

1. A complete local jar at `libs/create-1.21.1-6.0.11.jar`.
2. The local Maven repository through `mavenLocal()`.
3. Remote Maven repositories.

If you keep the Create source checkout next to this repository, publish it to your local Maven repository once:

```powershell
cd ..\Create
.\gradlew.bat publishToMavenLocal
cd "..\Create-HyperPressure Engineering"
.\gradlew.bat runClient
```

Do not commit Create jars. The `libs/*.jar` files are intentionally ignored.

## Project Layout

```text
src/main/java/com/kaifa/hyperpressure/
  HyperPressure.java              Mod entrypoint
  registry/                       DeferredRegister entries for blocks, items, recipes, tabs, block entities
  content/handpump/               Hand-cranked plunger pump and pressurizing recipe logic
  content/equipment/              Pressure goggles and pressure-display contracts
  content/materials/              Pressure alloy item behavior
  client/                         Client-only setup and wearable model code

src/main/resources/
  META-INF/neoforge.mods.toml     NeoForge mod metadata
  assets/hyperpressure/           Blockstates, models, textures, and language files
  data/hyperpressure/             Recipes, tags, and advancements
  data/create/                    Create compatibility tags
  data/curios/                    Head-slot compatibility tags

tools/                            Asset generation helpers
gradle/                           Gradle wrapper files
build.gradle                      NeoForge/Create Gradle build
gradle.properties                 Version and mod metadata
```

Build output, run directories, IDE metadata, local jars, generated resources, and planning documents are intentionally ignored.

## Architecture Direction

The project is organized around small feature packages under `content/`, with all game object registration centralized in `registry/`. This keeps early gameplay systems easy to expand without mixing registration, simulation, rendering, and data definitions.

The pressure system should grow as a server-side simulation first. Blocks that store or move pressure should expose narrow interfaces for pressure capacity, flow limits, medium type, and failure thresholds. Client renderers and HUD displays should read synchronized state rather than owning gameplay decisions. Create integration should stay explicit: kinetic input, processing recipes, goggles display, ponder scenes, and redstone behavior should each live behind focused adapters.

## Contributing

This is an open-source Create addon project, and contributions are welcome. Good places to help include pressure-network design, Create kinetic integration, block and machine implementation, HUD/goggles display, balancing, recipes, textures, models, Ponder scenes, localization, and documentation.

For larger changes, please open an issue or discussion first and describe the intended gameplay behavior. Keep commits focused, avoid committing build output or local dependency jars, and test with JDK 21 when the change touches code or generated resources.

## License

This project is intended to be open source. The current `LICENSE` file is still an early placeholder, so replace it with the final open-source license before a formal public release.
