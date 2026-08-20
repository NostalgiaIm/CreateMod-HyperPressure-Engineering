package com.kaifa.hyperpressure.registry;

import com.kaifa.hyperpressure.HyperPressure;
import com.kaifa.hyperpressure.content.handpump.HandCrankedPlungerPumpBlock;

import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;

public class HPBlocks {
    private static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(HyperPressure.MOD_ID);

    public static final DeferredBlock<HandCrankedPlungerPumpBlock> HAND_CRANKED_PLUNGER_PUMP = BLOCKS.registerBlock(
        "hand_cranked_plunger_pump",
        HandCrankedPlungerPumpBlock::new,
        BlockBehaviour.Properties.ofFullCopy(Blocks.IRON_BLOCK)
            .strength(3.5f, 8.0f)
            .noOcclusion()
            .dynamicShape()
            .lightLevel(state -> state.getValue(HandCrankedPlungerPumpBlock.GLOWING) ? 6 : 0)
    );

    public static void register(IEventBus modEventBus) {
        BLOCKS.register(modEventBus);
    }
}
