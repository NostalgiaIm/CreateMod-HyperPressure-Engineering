package com.kaifa.hyperpressure.content.handpump;

import com.kaifa.hyperpressure.registry.HPBlockEntityTypes;

import com.mojang.serialization.MapCodec;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.ItemInteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.DirectionProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

public class HandCrankedPlungerPumpBlock extends BaseEntityBlock {
    public static final MapCodec<HandCrankedPlungerPumpBlock> CODEC = simpleCodec(HandCrankedPlungerPumpBlock::new);
    public static final DirectionProperty FACING = BlockStateProperties.HORIZONTAL_FACING;
    public static final BooleanProperty GLOWING = BooleanProperty.create("glowing");

    private static final VoxelShape SHAPE = Shapes.or(
        Block.box(1, 0, 1, 15, 4, 15),
        Block.box(3, 4, 3, 13, 14, 13),
        Block.box(4, 14, 6, 14, 16, 10),
        Block.box(11, 5, 5, 16, 10, 11)
    );

    public HandCrankedPlungerPumpBlock(Properties properties) {
        super(properties);
        registerDefaultState(stateDefinition.any()
            .setValue(FACING, Direction.NORTH)
            .setValue(GLOWING, false));
    }

    @Override
    protected MapCodec<? extends BaseEntityBlock> codec() {
        return CODEC;
    }

    @Override
    public BlockState getStateForPlacement(BlockPlaceContext context) {
        return defaultBlockState().setValue(FACING, context.getHorizontalDirection().getOpposite());
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        builder.add(FACING, GLOWING);
    }

    @Override
    protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
        return SHAPE;
    }

    @Override
    protected RenderShape getRenderShape(BlockState state) {
        return RenderShape.MODEL;
    }

    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new HandCrankedPlungerPumpBlockEntity(pos, state);
    }

    @Override
    protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player,
        BlockHitResult hitResult) {
        if (level.getBlockEntity(pos) instanceof HandCrankedPlungerPumpBlockEntity pump) {
            pump.tryCrank(player);
            return InteractionResult.sidedSuccess(level.isClientSide);
        }
        return InteractionResult.PASS;
    }

    @Override
    protected ItemInteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos,
        Player player, InteractionHand hand, BlockHitResult hitResult) {
        if (level.getBlockEntity(pos) instanceof HandCrankedPlungerPumpBlockEntity pump && isPumpIngredient(stack)) {
            if (!level.isClientSide && pump.tryInsertIngredient(stack)) {
                if (!player.getAbilities().instabuild) {
                    stack.shrink(1);
                }
            }
            return ItemInteractionResult.sidedSuccess(level.isClientSide);
        }
        return ItemInteractionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
    }

    @Override
    protected void onRemove(BlockState state, Level level, BlockPos pos, BlockState newState, boolean movedByPiston) {
        boolean blockChanged = !state.is(newState.getBlock());
        if (state.hasBlockEntity() && (blockChanged || !newState.hasBlockEntity())) {
            if (!movedByPiston && level.getBlockEntity(pos) instanceof HandCrankedPlungerPumpBlockEntity pump) {
                pump.dropContents();
            }
            level.removeBlockEntity(pos);
        }
    }

    @Override
    public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
        if (level.getBlockEntity(pos) instanceof HandCrankedPlungerPumpBlockEntity pump) {
            pump.spawnAmbientEffects(random);
        }
    }

    @Override
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state,
        BlockEntityType<T> blockEntityType) {
        return createTickerHelper(blockEntityType, HPBlockEntityTypes.HAND_CRANKED_PLUNGER_PUMP.get(),
            HandCrankedPlungerPumpBlockEntity::tick);
    }

    private static boolean isPumpIngredient(ItemStack stack) {
        return stack.is(Items.IRON_INGOT) || stack.is(Items.COAL) || stack.is(Items.CHARCOAL);
    }
}
