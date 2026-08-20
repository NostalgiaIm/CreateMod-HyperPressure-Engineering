package com.kaifa.hyperpressure.content.handpump;

import com.kaifa.hyperpressure.registry.HPBlockEntityTypes;
import com.kaifa.hyperpressure.registry.HPRecipeTypes;

import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.DustParticleOptions;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientGamePacketListener;
import net.minecraft.network.protocol.game.ClientboundBlockEntityDataPacket;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.RecipeHolder;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;
import org.joml.Vector3f;

public class HandCrankedPlungerPumpBlockEntity extends BlockEntity {
    public static final float MAX_PRESSURE = 10.0f;
    public static final float HIGH_PRESSURE_ALLOY_PRESSURE_COST = 4.0f;
    public static final int CRANK_TICKS_PER_TURN = 40;
    public static final int FEED_ANIMATION_TICKS = 24;
    private static final DustParticleOptions OVERPRESSURE_RED = new DustParticleOptions(new Vector3f(1.0f, 0.08f, 0.02f), 1.25f);

    private float pressure;
    private float crankAngle;
    private float previousCrankAngle;
    private int activeCrankTicks;
    private int feedAnimationTicks;
    private int fullPressureClickCooldown;
    private int shakeTicks;
    private long lastCrankGameTime = Long.MIN_VALUE;
    private boolean hasInputIronVisual;
    private ItemStack storedIron = ItemStack.EMPTY;
    private ItemStack storedCarbon = ItemStack.EMPTY;
    private ItemStack visibleInputStack = ItemStack.EMPTY;

    public HandCrankedPlungerPumpBlockEntity(BlockPos pos, BlockState blockState) {
        super(HPBlockEntityTypes.HAND_CRANKED_PLUNGER_PUMP.get(), pos, blockState);
    }

    public static void tick(Level level, BlockPos pos, BlockState state, HandCrankedPlungerPumpBlockEntity pump) {
        pump.previousCrankAngle = pump.crankAngle;

        if (pump.activeCrankTicks > 0) {
            pump.activeCrankTicks--;
            pump.crankAngle = wrapAngle(pump.crankAngle + 360f / CRANK_TICKS_PER_TURN);
        }

        if (!level.isClientSide) {
            pump.tryProcessRecipe();
        }

        if (pump.feedAnimationTicks > 0) {
            pump.feedAnimationTicks--;
            if (pump.feedAnimationTicks == 0) {
                pump.hasInputIronVisual = false;
                pump.visibleInputStack = ItemStack.EMPTY;
                pump.sync();
            }
        }

        if (pump.shakeTicks > 0) {
            pump.shakeTicks--;
        }

        if (pump.fullPressureClickCooldown > 0) {
            pump.fullPressureClickCooldown--;
        }

        if (!level.isClientSide && level.getGameTime() % 20 == 0 && level.getGameTime() - pump.lastCrankGameTime > 40) {
            float oldPressure = pump.pressure;
            pump.pressure = Mth.clamp(pump.pressure - 0.2f, 0f, MAX_PRESSURE);
            if (Math.abs(oldPressure - pump.pressure) > 0.001f) {
                pump.updateGlowState();
                pump.sync();
                pump.setChanged();
            }
        }
    }

    public void tryCrank(Player player) {
        if (level == null) {
            return;
        }

        if (level.isClientSide) {
            return;
        }

        if (pressure >= MAX_PRESSURE) {
            activeCrankTicks = 0;
            shakeTicks = 8;
            if (fullPressureClickCooldown == 0) {
                level.playSound(null, worldPosition, SoundEvents.NOTE_BLOCK_BELL.value(), SoundSource.BLOCKS, 0.8f, 1.85f);
                level.playSound(null, worldPosition, SoundEvents.IRON_TRAPDOOR_CLOSE, SoundSource.BLOCKS, 0.65f, 0.65f);
                fullPressureClickCooldown = 10;
            }
            sync();
            return;
        }

        pressure = Mth.clamp(pressure + 1.0f, 0f, MAX_PRESSURE);
        activeCrankTicks = Math.max(activeCrankTicks, CRANK_TICKS_PER_TURN);
        lastCrankGameTime = level.getGameTime();

        if (pressure > 9.0f) {
            shakeTicks = 6;
        }

        playCrankSound();
        updateGlowState();
        sync();
        setChanged();
    }

    public boolean tryInsertIngredient(ItemStack inserted) {
        if (level == null || level.isClientSide || feedAnimationTicks > 0) {
            return false;
        }

        if (inserted.is(Items.IRON_INGOT)) {
            if (!storedIron.isEmpty()) {
                playDenySound();
                return false;
            }
            storedIron = inserted.copyWithCount(1);
        } else if (inserted.is(Items.COAL) || inserted.is(Items.CHARCOAL)) {
            if (!storedCarbon.isEmpty()) {
                playDenySound();
                return false;
            }
            storedCarbon = inserted.copyWithCount(1);
        } else {
            return false;
        }

        visibleInputStack = inserted.copyWithCount(1);
        hasInputIronVisual = true;
        feedAnimationTicks = FEED_ANIMATION_TICKS;
        level.playSound(null, worldPosition, SoundEvents.ITEM_FRAME_ADD_ITEM, SoundSource.BLOCKS, 0.65f, 1.25f);
        sync();
        setChanged();
        return true;
    }

    public void dropContents() {
        if (level == null || level.isClientSide) {
            return;
        }

        if (!storedIron.isEmpty()) {
            Block.popResource(level, worldPosition, storedIron);
            storedIron = ItemStack.EMPTY;
        }
        if (!storedCarbon.isEmpty()) {
            Block.popResource(level, worldPosition, storedCarbon);
            storedCarbon = ItemStack.EMPTY;
        }
    }

    public void spawnAmbientEffects(RandomSource random) {
        if (level == null) {
            return;
        }

        if (pressure > 8.0f && random.nextFloat() < 0.45f) {
            Vec3 outlet = getOutletCenter();
            for (int i = 0; i < 1 + random.nextInt(2); i++) {
                level.addParticle(ParticleTypes.CLOUD,
                    outlet.x + (random.nextDouble() - 0.5) * 0.08,
                    outlet.y + random.nextDouble() * 0.08,
                    outlet.z + (random.nextDouble() - 0.5) * 0.08,
                    (random.nextDouble() - 0.5) * 0.025,
                    0.025 + random.nextDouble() * 0.025,
                    (random.nextDouble() - 0.5) * 0.025);
            }
        }

        if (pressure > 6.0f && random.nextFloat() < 0.18f) {
            Direction facing = getBlockState().getValue(HandCrankedPlungerPumpBlock.FACING);
            Vec3 glow = Vec3.atCenterOf(worldPosition).add(Vec3.atLowerCornerOf(facing.getNormal()).scale(0.51));
            level.addParticle(ParticleTypes.ELECTRIC_SPARK,
                glow.x + (random.nextDouble() - 0.5) * 0.25,
                glow.y + random.nextDouble() * 0.35,
                glow.z + (random.nextDouble() - 0.5) * 0.25,
                0, 0.01, 0);
        }

        if (pressure > 9.5f && random.nextFloat() < 0.72f) {
            Vec3 outlet = getOutletCenter();
            for (int i = 0; i < 2 + random.nextInt(3); i++) {
                level.addParticle(OVERPRESSURE_RED,
                    outlet.x + (random.nextDouble() - 0.5) * 0.18,
                    outlet.y + random.nextDouble() * 0.18,
                    outlet.z + (random.nextDouble() - 0.5) * 0.18,
                    (random.nextDouble() - 0.5) * 0.045,
                    0.035 + random.nextDouble() * 0.035,
                    (random.nextDouble() - 0.5) * 0.045);
            }

            Vec3 gauge = getGaugeCenter();
            level.addParticle(OVERPRESSURE_RED,
                gauge.x + (random.nextDouble() - 0.5) * 0.25,
                gauge.y + 0.08 + random.nextDouble() * 0.18,
                gauge.z + (random.nextDouble() - 0.5) * 0.25,
                0, 0.035, 0);

            if (random.nextFloat() < 0.25f) {
                level.addParticle(ParticleTypes.LAVA,
                    outlet.x,
                    outlet.y + 0.03,
                    outlet.z,
                    0, 0.02, 0);
            }
        }
    }

    public float getPressure(float partialTick) {
        return pressure;
    }

    public float getCrankAngle(float partialTick) {
        return Mth.rotLerp(partialTick, previousCrankAngle, crankAngle);
    }

    public float getPistonOffset(float partialTick) {
        float angle = getCrankAngle(partialTick) * Mth.DEG_TO_RAD;
        return -4.0f * (1.0f - Mth.cos(angle));
    }

    public float getNeedleAngle() {
        return pressure / MAX_PRESSURE * 360.0f;
    }

    public float getFeedProgress(float partialTick) {
        if (!hasInputIronVisual) {
            return 0f;
        }
        return 1.0f - Mth.clamp((feedAnimationTicks - partialTick) / FEED_ANIMATION_TICKS, 0f, 1f);
    }

    public boolean hasInputIronVisual() {
        return hasInputIronVisual;
    }

    public ItemStack getVisibleInputStack() {
        return visibleInputStack;
    }

    public boolean shouldGlow() {
        return pressure > 6.0f;
    }

    public boolean shouldWarn() {
        return pressure > 9.5f;
    }

    public float getShakeOffset(float partialTick) {
        if (shakeTicks <= 0) {
            return 0f;
        }
        float pulse = Mth.sin((shakeTicks - partialTick) * 2.6f);
        return pulse * 0.015f;
    }

    @Override
    protected void loadAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.loadAdditional(tag, registries);
        pressure = tag.getFloat("Pressure");
        crankAngle = tag.getFloat("CrankAngle");
        previousCrankAngle = crankAngle;
        activeCrankTicks = tag.getInt("ActiveCrankTicks");
        feedAnimationTicks = tag.getInt("FeedAnimationTicks");
        shakeTicks = tag.getInt("ShakeTicks");
        hasInputIronVisual = tag.getBoolean("HasInputIronVisual");
        storedIron = ItemStack.parseOptional(registries, tag.getCompound("StoredIron"));
        storedCarbon = ItemStack.parseOptional(registries, tag.getCompound("StoredCarbon"));
        visibleInputStack = ItemStack.parseOptional(registries, tag.getCompound("VisibleInputStack"));
    }

    @Override
    protected void saveAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.saveAdditional(tag, registries);
        tag.putFloat("Pressure", pressure);
        tag.putFloat("CrankAngle", crankAngle);
        tag.putInt("ActiveCrankTicks", activeCrankTicks);
        tag.putInt("FeedAnimationTicks", feedAnimationTicks);
        tag.putInt("ShakeTicks", shakeTicks);
        tag.putBoolean("HasInputIronVisual", hasInputIronVisual);
        tag.put("StoredIron", storedIron.saveOptional(registries));
        tag.put("StoredCarbon", storedCarbon.saveOptional(registries));
        tag.put("VisibleInputStack", visibleInputStack.saveOptional(registries));
    }

    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider registries) {
        return saveWithoutMetadata(registries);
    }

    @Override
    public Packet<ClientGamePacketListener> getUpdatePacket() {
        return ClientboundBlockEntityDataPacket.create(this);
    }

    private void playCrankSound() {
        if (level == null) {
            return;
        }

        float pitch = pressure < 4.0f ? 1.35f : pressure < 8.0f ? 0.95f : 0.62f;
        float volume = pressure < 8.0f ? 0.45f : 0.7f;
        level.playSound(null, worldPosition, SoundEvents.CHAIN_PLACE, SoundSource.BLOCKS, volume, pitch);
        if (pressure > 8.0f) {
            level.playSound(null, worldPosition, SoundEvents.IRON_DOOR_OPEN, SoundSource.BLOCKS, 0.35f, 0.55f);
        }
    }

    private void playDenySound() {
        if (level == null) {
            return;
        }

        level.playSound(null, worldPosition, SoundEvents.DISPENSER_FAIL, SoundSource.BLOCKS, 0.55f, 0.65f);
    }

    private void tryProcessRecipe() {
        if (storedIron.isEmpty() || storedCarbon.isEmpty() || level == null) {
            return;
        }

        HandPumpRecipeInput input = new HandPumpRecipeInput(storedIron, storedCarbon, pressure);
        RecipeHolder<HandPumpPressurizingRecipe> recipe = level.getRecipeManager()
            .getRecipeFor(HPRecipeTypes.HAND_PUMP_PRESSURIZING_TYPE.get(), input, level)
            .orElse(null);
        if (recipe == null) {
            return;
        }

        ItemStack result = recipe.value().assemble(input, level.registryAccess());
        if (result.isEmpty()) {
            return;
        }

        storedIron = ItemStack.EMPTY;
        storedCarbon = ItemStack.EMPTY;
        pressure = Mth.clamp(pressure - recipe.value().pressure(), 0f, MAX_PRESSURE);
        Block.popResource(level, worldPosition.relative(getBlockState().getValue(HandCrankedPlungerPumpBlock.FACING).getOpposite()),
            result);
        level.playSound(null, worldPosition, SoundEvents.ANVIL_USE, SoundSource.BLOCKS, 0.55f, 1.75f);
        level.playSound(null, worldPosition, SoundEvents.AMETHYST_BLOCK_CHIME, SoundSource.BLOCKS, 0.4f, 1.45f);
        updateGlowState();
        sync();
        setChanged();
    }

    private void updateGlowState() {
        if (level == null || level.isClientSide) {
            return;
        }

        BlockState state = getBlockState();
        boolean shouldGlow = shouldGlow();
        if (state.getValue(HandCrankedPlungerPumpBlock.GLOWING) != shouldGlow) {
            level.setBlock(worldPosition, state.setValue(HandCrankedPlungerPumpBlock.GLOWING, shouldGlow), Block.UPDATE_ALL);
        }
    }

    private void sync() {
        if (level == null || level.isClientSide) {
            return;
        }

        BlockState state = getBlockState();
        level.sendBlockUpdated(worldPosition, state, state, Block.UPDATE_CLIENTS);
    }

    private Vec3 getOutletCenter() {
        Direction facing = getBlockState().getValue(HandCrankedPlungerPumpBlock.FACING);
        Direction back = facing.getOpposite();
        return Vec3.atCenterOf(worldPosition)
            .add(Vec3.atLowerCornerOf(back.getNormal()).scale(0.55))
            .add(0, -0.26, 0);
    }

    private Vec3 getGaugeCenter() {
        Direction facing = getBlockState().getValue(HandCrankedPlungerPumpBlock.FACING);
        return Vec3.atCenterOf(worldPosition)
            .add(Vec3.atLowerCornerOf(facing.getNormal()).scale(0.55))
            .add(0, -0.18, 0);
    }

    private static float wrapAngle(float angle) {
        angle %= 360f;
        return angle < 0 ? angle + 360f : angle;
    }
}
