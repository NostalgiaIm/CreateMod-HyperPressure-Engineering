package com.kaifa.hyperpressure.registry;

import com.kaifa.hyperpressure.HyperPressure;

import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public class HPCreativeModeTabs {
    private static final DeferredRegister<CreativeModeTab> TABS =
        DeferredRegister.create(Registries.CREATIVE_MODE_TAB, HyperPressure.MOD_ID);

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> MAIN = TABS.register("main",
        () -> CreativeModeTab.builder()
            .title(Component.translatable("itemGroup.hyperpressure.main"))
            .icon(HPItems.HAND_CRANKED_PLUNGER_PUMP::toStack)
            .displayItems((parameters, output) -> {
                output.accept(HPItems.HAND_CRANKED_PLUNGER_PUMP.get());
                output.accept(HPItems.PRESSURE_GOGGLES.get());
                output.accept(HPItems.SUPER_ENGINEER_GOGGLES.get());
                output.accept(HPItems.HIGH_PRESSURE_ALLOY.get());
                output.accept(HPItems.REINFORCED_HIGH_PRESSURE_ALLOY.get());
                output.accept(HPItems.RESONANT_ALLOY.get());
                output.accept(HPItems.ULTRA_PRESSURE_ALLOY.get());
                output.accept(HPItems.DENSE_ULTRA_PRESSURE_PLATE.get());
            })
            .build());

    public static void register(IEventBus modEventBus) {
        TABS.register(modEventBus);
    }
}
