package com.kaifa.hyperpressure.content.handpump;

import com.mojang.serialization.MapCodec;
import com.mojang.serialization.codecs.RecordCodecBuilder;

import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.item.crafting.RecipeSerializer;

public class HandPumpPressurizingRecipeSerializer implements RecipeSerializer<HandPumpPressurizingRecipe> {
    private static final MapCodec<HandPumpPressurizingRecipe> CODEC = RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Ingredient.CODEC_NONEMPTY.fieldOf("first").forGetter(HandPumpPressurizingRecipe::firstIngredient),
            Ingredient.CODEC_NONEMPTY.fieldOf("second").forGetter(HandPumpPressurizingRecipe::secondIngredient),
            ItemStack.CODEC.fieldOf("result").forGetter(HandPumpPressurizingRecipe::result),
            com.mojang.serialization.Codec.FLOAT.optionalFieldOf("pressure", 4.0f)
                .forGetter(HandPumpPressurizingRecipe::pressure)
        ).apply(instance, HandPumpPressurizingRecipe::new));

    private static final StreamCodec<RegistryFriendlyByteBuf, HandPumpPressurizingRecipe> STREAM_CODEC =
        StreamCodec.composite(
            Ingredient.CONTENTS_STREAM_CODEC, HandPumpPressurizingRecipe::firstIngredient,
            Ingredient.CONTENTS_STREAM_CODEC, HandPumpPressurizingRecipe::secondIngredient,
            ItemStack.STREAM_CODEC, HandPumpPressurizingRecipe::result,
            ByteBufCodecs.FLOAT, HandPumpPressurizingRecipe::pressure,
            HandPumpPressurizingRecipe::new
        );

    @Override
    public MapCodec<HandPumpPressurizingRecipe> codec() {
        return CODEC;
    }

    @Override
    public StreamCodec<RegistryFriendlyByteBuf, HandPumpPressurizingRecipe> streamCodec() {
        return STREAM_CODEC;
    }
}
