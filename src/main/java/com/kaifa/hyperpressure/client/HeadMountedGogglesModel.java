package com.kaifa.hyperpressure.client;

import com.mojang.blaze3d.vertex.PoseStack;

import net.minecraft.client.resources.model.BakedModel;
import net.minecraft.world.item.ItemDisplayContext;
import net.neoforged.neoforge.client.model.BakedModelWrapper;

public class HeadMountedGogglesModel extends BakedModelWrapper<BakedModel> {
    private final BakedModel headModel;

    public HeadMountedGogglesModel(BakedModel inventoryModel, BakedModel headModel) {
        super(inventoryModel);
        this.headModel = headModel;
    }

    @Override
    public BakedModel applyTransform(ItemDisplayContext context, PoseStack poseStack, boolean leftHanded) {
        if (context == ItemDisplayContext.HEAD && headModel != null)
            return headModel.applyTransform(context, poseStack, leftHanded);

        return super.applyTransform(context, poseStack, leftHanded);
    }
}
