package com.kaifa.hyperpressure.registry;

import com.kaifa.hyperpressure.HyperPressure;
import com.kaifa.hyperpressure.content.handpump.HandPumpPressurizingRecipe;
import com.kaifa.hyperpressure.content.handpump.HandPumpPressurizingRecipeSerializer;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.crafting.RecipeSerializer;
import net.minecraft.world.item.crafting.RecipeType;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public class HPRecipeTypes {
    private static final ResourceLocation HAND_PUMP_PRESSURIZING_ID =
        ResourceLocation.fromNamespaceAndPath(HyperPressure.MOD_ID, "hand_pump_pressurizing");

    private static final DeferredRegister<RecipeSerializer<?>> RECIPE_SERIALIZERS =
        DeferredRegister.create(BuiltInRegistries.RECIPE_SERIALIZER, HyperPressure.MOD_ID);
    private static final DeferredRegister<RecipeType<?>> RECIPE_TYPES =
        DeferredRegister.create(Registries.RECIPE_TYPE, HyperPressure.MOD_ID);

    public static final DeferredHolder<RecipeSerializer<?>, HandPumpPressurizingRecipeSerializer>
        HAND_PUMP_PRESSURIZING_SERIALIZER = RECIPE_SERIALIZERS.register("hand_pump_pressurizing",
            HandPumpPressurizingRecipeSerializer::new);

    public static final DeferredHolder<RecipeType<?>, RecipeType<HandPumpPressurizingRecipe>>
        HAND_PUMP_PRESSURIZING_TYPE = RECIPE_TYPES.register("hand_pump_pressurizing",
            () -> RecipeType.simple(HAND_PUMP_PRESSURIZING_ID));

    public static void register(IEventBus modEventBus) {
        RECIPE_SERIALIZERS.register(modEventBus);
        RECIPE_TYPES.register(modEventBus);
    }
}
