package com.kaifa.hyperpressure.registry;

import com.kaifa.hyperpressure.HyperPressure;
import com.kaifa.hyperpressure.content.equipment.PressureGogglesItem;
import com.kaifa.hyperpressure.content.equipment.SuperEngineerGogglesItem;
import com.kaifa.hyperpressure.content.materials.AlloyItem;
import com.simibubi.create.content.equipment.goggles.GogglesItem;

import net.minecraft.world.entity.EquipmentSlot;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Rarity;

public class HPItems {
    private static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(HyperPressure.MOD_ID);

    public static final DeferredItem<BlockItem> HAND_CRANKED_PLUNGER_PUMP =
        ITEMS.registerSimpleBlockItem(HPBlocks.HAND_CRANKED_PLUNGER_PUMP);

    public static final DeferredItem<PressureGogglesItem> PRESSURE_GOGGLES =
        ITEMS.registerItem("pressure_goggles", PressureGogglesItem::new, new Item.Properties().stacksTo(1));

    public static final DeferredItem<SuperEngineerGogglesItem> SUPER_ENGINEER_GOGGLES =
        ITEMS.registerItem("super_engineer_goggles", SuperEngineerGogglesItem::new, new Item.Properties().stacksTo(1));

    public static final DeferredItem<AlloyItem> HIGH_PRESSURE_ALLOY =
        ITEMS.registerItem("high_pressure_alloy", properties -> new AlloyItem(properties, 1, false),
            new Item.Properties());

    public static final DeferredItem<AlloyItem> REINFORCED_HIGH_PRESSURE_ALLOY =
        ITEMS.registerItem("reinforced_high_pressure_alloy", properties -> new AlloyItem(properties, 2, false),
            new Item.Properties().rarity(Rarity.UNCOMMON));

    public static final DeferredItem<AlloyItem> RESONANT_ALLOY =
        ITEMS.registerItem("resonant_alloy", properties -> new AlloyItem(properties, 2, true),
            new Item.Properties().rarity(Rarity.UNCOMMON));

    public static final DeferredItem<AlloyItem> ULTRA_PRESSURE_ALLOY =
        ITEMS.registerItem("ultra_pressure_alloy", properties -> new AlloyItem(properties, 3, true),
            new Item.Properties().rarity(Rarity.RARE).fireResistant());

    public static final DeferredItem<AlloyItem> DENSE_ULTRA_PRESSURE_PLATE =
        ITEMS.registerItem("dense_ultra_pressure_plate", properties -> new AlloyItem(properties, 4, true),
            new Item.Properties().rarity(Rarity.EPIC).fireResistant());

    public static void register(IEventBus modEventBus) {
        ITEMS.register(modEventBus);

        GogglesItem.addIsWearingPredicate(player ->
            player.getItemBySlot(EquipmentSlot.HEAD).is(SUPER_ENGINEER_GOGGLES.get()));
    }
}
