package com.kaifa.hyperpressure.content.handpump;

import java.util.List;

import com.kaifa.hyperpressure.registry.HPRecipeTypes;

import net.minecraft.core.HolderLookup;
import net.minecraft.core.NonNullList;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.item.crafting.Recipe;
import net.minecraft.world.item.crafting.RecipeSerializer;
import net.minecraft.world.item.crafting.RecipeType;
import net.minecraft.world.level.Level;

public record HandPumpPressurizingRecipe(
    Ingredient firstIngredient,
    Ingredient secondIngredient,
    ItemStack result,
    float pressure
) implements Recipe<HandPumpRecipeInput> {
    @Override
    public boolean matches(HandPumpRecipeInput input, Level level) {
        if (input.pressure() < pressure) {
            return false;
        }

        ItemStack first = input.first();
        ItemStack second = input.second();
        return (firstIngredient.test(first) && secondIngredient.test(second))
            || (firstIngredient.test(second) && secondIngredient.test(first));
    }

    @Override
    public ItemStack assemble(HandPumpRecipeInput input, HolderLookup.Provider registries) {
        return result.copy();
    }

    @Override
    public boolean canCraftInDimensions(int width, int height) {
        return width * height >= 2;
    }

    @Override
    public ItemStack getResultItem(HolderLookup.Provider registries) {
        return result;
    }

    @Override
    public NonNullList<Ingredient> getIngredients() {
        return NonNullList.copyOf(List.of(firstIngredient, secondIngredient));
    }

    @Override
    public RecipeSerializer<?> getSerializer() {
        return HPRecipeTypes.HAND_PUMP_PRESSURIZING_SERIALIZER.get();
    }

    @Override
    public RecipeType<?> getType() {
        return HPRecipeTypes.HAND_PUMP_PRESSURIZING_TYPE.get();
    }

    @Override
    public boolean isSpecial() {
        return true;
    }
}
