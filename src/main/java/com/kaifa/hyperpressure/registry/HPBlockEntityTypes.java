package com.kaifa.hyperpressure.registry;

import com.kaifa.hyperpressure.HyperPressure;
import com.kaifa.hyperpressure.content.handpump.HandCrankedPlungerPumpBlockEntity;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public class HPBlockEntityTypes {
    private static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITY_TYPES =
        DeferredRegister.create(Registries.BLOCK_ENTITY_TYPE, HyperPressure.MOD_ID);

    public static final DeferredHolder<BlockEntityType<?>, BlockEntityType<HandCrankedPlungerPumpBlockEntity>>
        HAND_CRANKED_PLUNGER_PUMP = BLOCK_ENTITY_TYPES.register("hand_cranked_plunger_pump",
            () -> BlockEntityType.Builder.of(
                HandCrankedPlungerPumpBlockEntity::new,
                HPBlocks.HAND_CRANKED_PLUNGER_PUMP.get()
            ).build(null));

    public static void register(IEventBus modEventBus) {
        BLOCK_ENTITY_TYPES.register(modEventBus);
    }
}
