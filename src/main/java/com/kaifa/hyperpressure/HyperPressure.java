package com.kaifa.hyperpressure;

import org.slf4j.Logger;

import com.kaifa.hyperpressure.registry.HPBlockEntityTypes;
import com.kaifa.hyperpressure.registry.HPBlocks;
import com.kaifa.hyperpressure.registry.HPCreativeModeTabs;
import com.kaifa.hyperpressure.registry.HPItems;
import com.kaifa.hyperpressure.registry.HPRecipeTypes;
import com.mojang.logging.LogUtils;

import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.ModContainer;

@Mod(HyperPressure.MOD_ID)
public class HyperPressure {
    public static final String MOD_ID = "hyperpressure";
    public static final Logger LOGGER = LogUtils.getLogger();

    public HyperPressure(IEventBus modEventBus, ModContainer modContainer) {
        HPBlocks.register(modEventBus);
        HPItems.register(modEventBus);
        HPBlockEntityTypes.register(modEventBus);
        HPRecipeTypes.register(modEventBus);
        HPCreativeModeTabs.register(modEventBus);

        LOGGER.info("HyperPressure Engineering initializing.");
    }
}
