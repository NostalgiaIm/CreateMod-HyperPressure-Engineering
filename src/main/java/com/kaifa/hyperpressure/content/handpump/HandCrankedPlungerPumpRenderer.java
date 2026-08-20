package com.kaifa.hyperpressure.content.handpump;

import com.kaifa.hyperpressure.HyperPressure;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;

import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.block.ModelBlockRenderer;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderer;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.resources.model.BakedModel;
import net.minecraft.client.resources.model.ModelResourceLocation;
import net.minecraft.core.Direction;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.neoforge.client.model.data.ModelData;
import org.joml.AxisAngle4f;
import org.joml.Quaternionf;

public class HandCrankedPlungerPumpRenderer implements BlockEntityRenderer<HandCrankedPlungerPumpBlockEntity> {
    public static final ModelResourceLocation BODY = standalone("block/hand_cranked_plunger_pump/body");
    public static final ModelResourceLocation CRANK = standalone("block/hand_cranked_plunger_pump/crank");
    public static final ModelResourceLocation PLUNGER = standalone("block/hand_cranked_plunger_pump/plunger");
    public static final ModelResourceLocation NEEDLE = standalone("block/hand_cranked_plunger_pump/gauge_needle");
    public static final ModelResourceLocation INPUT_IRON = standalone("block/hand_cranked_plunger_pump/input_iron");

    private final RandomSource random = RandomSource.create();

    public HandCrankedPlungerPumpRenderer(BlockEntityRendererProvider.Context context) {
    }

    @Override
    public void render(HandCrankedPlungerPumpBlockEntity pump, float partialTick, PoseStack poseStack,
        MultiBufferSource bufferSource, int packedLight, int packedOverlay) {
        Minecraft minecraft = Minecraft.getInstance();
        ModelBlockRenderer modelRenderer = minecraft.getBlockRenderer().getModelRenderer();
        BlockState state = pump.getBlockState();
        int effectLight = pump.shouldGlow() ? LightTexture.FULL_BRIGHT : packedLight;

        poseStack.pushPose();
        rotateToFacing(poseStack, state.getValue(HandCrankedPlungerPumpBlock.FACING));

        float shake = pump.getShakeOffset(partialTick);
        if (shake != 0f) {
            poseStack.translate(shake, 0, -shake * 0.6f);
        }

        renderCrank(pump, partialTick, poseStack, bufferSource, modelRenderer, state, packedLight);
        renderPlunger(pump, partialTick, poseStack, bufferSource, modelRenderer, state, effectLight);
        renderNeedle(pump, poseStack, bufferSource, modelRenderer, state, effectLight);
        renderInputIron(pump, partialTick, poseStack, bufferSource, modelRenderer, state, packedLight);
        poseStack.popPose();
    }

    private void renderCrank(HandCrankedPlungerPumpBlockEntity pump, float partialTick, PoseStack poseStack,
        MultiBufferSource bufferSource, ModelBlockRenderer modelRenderer, BlockState state, int packedLight) {
        poseStack.pushPose();
        rotateAround(poseStack, 15.15f / 16f, 9f / 16f, 8f / 16f, -pump.getCrankAngle(partialTick), 1, 0, 0);
        renderModel(modelRenderer, bufferSource, state, poseStack, model(CRANK), packedLight, RenderType.cutout());
        poseStack.popPose();
    }

    private void renderPlunger(HandCrankedPlungerPumpBlockEntity pump, float partialTick, PoseStack poseStack,
        MultiBufferSource bufferSource, ModelBlockRenderer modelRenderer, BlockState state, int packedLight) {
        poseStack.pushPose();
        poseStack.translate(0, pump.getPistonOffset(partialTick) / 16f, 0);
        renderModel(modelRenderer, bufferSource, state, poseStack, model(PLUNGER), packedLight, RenderType.cutout());
        poseStack.popPose();
    }

    private void renderNeedle(HandCrankedPlungerPumpBlockEntity pump, PoseStack poseStack, MultiBufferSource bufferSource,
        ModelBlockRenderer modelRenderer, BlockState state, int packedLight) {
        poseStack.pushPose();
        rotateAround(poseStack, 8f / 16f, 5.15f / 16f, 0.12f / 16f, -pump.getNeedleAngle(), 0, 0, 1);
        renderModel(modelRenderer, bufferSource, state, poseStack, model(NEEDLE), packedLight, RenderType.cutout());
        poseStack.popPose();
    }

    private void renderInputIron(HandCrankedPlungerPumpBlockEntity pump, float partialTick, PoseStack poseStack,
        MultiBufferSource bufferSource, ModelBlockRenderer modelRenderer, BlockState state, int packedLight) {
        if (!pump.hasInputIronVisual()) {
            return;
        }

        ItemStack stack = pump.getVisibleInputStack();
        if (stack.isEmpty()) {
            renderLegacyInputIron(pump, partialTick, poseStack, bufferSource, modelRenderer, state, packedLight);
            return;
        }

        float progress = pump.getFeedProgress(partialTick);
        poseStack.pushPose();
        poseStack.translate(-progress * 0.2f, -progress * 0.035f, 0);
        float scale = 1.0f - progress * 0.25f;
        poseStack.translate(1.02f, 0.46f, 0.53f);
        poseStack.mulPose(new Quaternionf(new AxisAngle4f((float) Math.PI / 2f, 0, 1, 0)));
        poseStack.mulPose(new Quaternionf(new AxisAngle4f(-(float) Math.PI / 8f, 0, 0, 1)));
        poseStack.scale(0.34f * scale, 0.34f * scale, 0.34f * scale);
        Minecraft.getInstance().getItemRenderer()
            .renderStatic(stack, ItemDisplayContext.FIXED, packedLight, OverlayTexture.NO_OVERLAY, poseStack,
                bufferSource, pump.getLevel(), 0);
        poseStack.popPose();
    }

    private void renderLegacyInputIron(HandCrankedPlungerPumpBlockEntity pump, float partialTick, PoseStack poseStack,
        MultiBufferSource bufferSource, ModelBlockRenderer modelRenderer, BlockState state, int packedLight) {
        float progress = pump.getFeedProgress(partialTick);
        poseStack.pushPose();
        poseStack.translate(-progress * 0.2f, -progress * 0.035f, 0);
        float scale = 1.0f - progress * 0.25f;
        poseStack.translate(15.9f / 16f, 6.9f / 16f, 8.5f / 16f);
        poseStack.scale(scale, scale, scale);
        poseStack.translate(-15.9f / 16f, -6.9f / 16f, -8.5f / 16f);
        renderModel(modelRenderer, bufferSource, state, poseStack, model(INPUT_IRON), packedLight, RenderType.cutout());
        poseStack.popPose();
    }

    private void renderModel(ModelBlockRenderer modelRenderer, MultiBufferSource bufferSource, BlockState state,
        PoseStack poseStack, BakedModel model, int packedLight, RenderType renderType) {
        VertexConsumer consumer = bufferSource.getBuffer(renderType);
        random.setSeed(42L);
        modelRenderer.renderModel(
            poseStack.last(),
            consumer,
            state,
            model,
            1f,
            1f,
            1f,
            packedLight,
            OverlayTexture.NO_OVERLAY,
            ModelData.EMPTY,
            renderType
        );
    }

    private static void rotateToFacing(PoseStack poseStack, Direction facing) {
        float degrees = switch (facing) {
            case EAST -> 90f;
            case SOUTH -> 180f;
            case WEST -> 270f;
            default -> 0f;
        };
        rotateAround(poseStack, 0.5f, 0.5f, 0.5f, -degrees, 0, 1, 0);
    }

    private static void rotateAround(PoseStack poseStack, float x, float y, float z, float degrees,
        float axisX, float axisY, float axisZ) {
        poseStack.translate(x, y, z);
        poseStack.mulPose(new Quaternionf(new AxisAngle4f(degrees * (float) Math.PI / 180f, axisX, axisY, axisZ)));
        poseStack.translate(-x, -y, -z);
    }

    private static BakedModel model(ModelResourceLocation location) {
        Minecraft minecraft = Minecraft.getInstance();
        BakedModel model = minecraft.getModelManager().getModel(location);
        return model == null ? minecraft.getModelManager().getMissingModel() : model;
    }

    private static ModelResourceLocation standalone(String path) {
        return ModelResourceLocation.standalone(ResourceLocation.fromNamespaceAndPath(HyperPressure.MOD_ID, path));
    }
}
