package com.kaifa.hyperpressure.client;

import java.util.Map;

import com.kaifa.hyperpressure.HyperPressure;
import com.kaifa.hyperpressure.content.handpump.HandCrankedPlungerPumpRenderer;
import com.kaifa.hyperpressure.registry.HPBlockEntityTypes;

import net.minecraft.client.resources.model.BakedModel;
import net.minecraft.client.resources.model.ModelResourceLocation;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.neoforged.neoforge.client.event.ModelEvent;

@EventBusSubscriber(modid = HyperPressure.MOD_ID, value = Dist.CLIENT)
public class HyperPressureClient {
    private static final ModelResourceLocation PRESSURE_GOGGLES_INVENTORY =
        ModelResourceLocation.inventory(id("pressure_goggles"));
    private static final ModelResourceLocation PRESSURE_GOGGLES_HEAD =
        ModelResourceLocation.standalone(id("item/pressure_goggles/head"));
    private static final ModelResourceLocation SUPER_ENGINEER_GOGGLES_INVENTORY =
        ModelResourceLocation.inventory(id("super_engineer_goggles"));
    private static final ModelResourceLocation SUPER_ENGINEER_GOGGLES_HEAD =
        ModelResourceLocation.standalone(id("item/pressure_goggles/super_engineer_head"));

    @SubscribeEvent
    public static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
        event.registerBlockEntityRenderer(
            HPBlockEntityTypes.HAND_CRANKED_PLUNGER_PUMP.get(),
            HandCrankedPlungerPumpRenderer::new
        );
    }

    @SubscribeEvent
    public static void registerAdditionalModels(ModelEvent.RegisterAdditional event) {
        event.register(HandCrankedPlungerPumpRenderer.BODY);
        event.register(HandCrankedPlungerPumpRenderer.CRANK);
        event.register(HandCrankedPlungerPumpRenderer.PLUNGER);
        event.register(HandCrankedPlungerPumpRenderer.NEEDLE);
        event.register(HandCrankedPlungerPumpRenderer.INPUT_IRON);
        event.register(PRESSURE_GOGGLES_HEAD);
        event.register(SUPER_ENGINEER_GOGGLES_HEAD);
    }

    @SubscribeEvent
    public static void modifyBakingResult(ModelEvent.ModifyBakingResult event) {
        Map<ModelResourceLocation, BakedModel> models = event.getModels();
        replaceWithHeadModel(models, PRESSURE_GOGGLES_INVENTORY, PRESSURE_GOGGLES_HEAD);
        replaceWithHeadModel(models, SUPER_ENGINEER_GOGGLES_INVENTORY, SUPER_ENGINEER_GOGGLES_HEAD);
    }

    private static void replaceWithHeadModel(Map<ModelResourceLocation, BakedModel> models,
        ModelResourceLocation inventoryLocation, ModelResourceLocation headLocation) {
        BakedModel inventoryModel = models.get(inventoryLocation);
        BakedModel headModel = models.get(headLocation);

        if (inventoryModel != null && headModel != null)
            models.put(inventoryLocation, new HeadMountedGogglesModel(inventoryModel, headModel));
    }

    private static ResourceLocation id(String path) {
        return ResourceLocation.fromNamespaceAndPath(HyperPressure.MOD_ID, path);
    }
}
