import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";


const CO2_SAVINGS = {
    plastic: 0.5,
    glass: 0.3,
    paper: 0.2,
    metal: 0.8
};


const POINTS_PER_ITEM = 10;

const logRecycling = asyncHandler(async (req, res) => {
    const { item_type, quantity } = req.body;
    const userId = req.user._id;

    if (!item_type || !quantity) {
        throw new ApiError(400, "Item type and quantity are required");
    }

    if (!CO2_SAVINGS[item_type]) {
        throw new ApiError(400, "Invalid item type. Must be: plastic, glass, paper, or metal");
    }

    if (quantity <= 0 || !Number.isInteger(Number(quantity))) {
        throw new ApiError(400, "Quantity must be a positive integer");
    }

  
    const co2Saved = CO2_SAVINGS[item_type] * quantity;
    const pointsEarned = POINTS_PER_ITEM * quantity;


    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $inc: {
                totalItemsRecycled: quantity,
                co2Saved: co2Saved,
                points: pointsEarned
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(500, "Failed to update user stats");
    }

    return res.status(200).json(
        new ApiResponse(200, {
            user: updatedUser,
            recyclingLog: {
                item_type,
                quantity,
                co2Saved,
                pointsEarned,
                timestamp: new Date()
            }
        }, "Recycling activity logged successfully")
    );
});

const getUserStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {
            totalItemsRecycled: user.totalItemsRecycled || 0,
            co2Saved: user.co2Saved || 0,
            points: user.points || 0
        }, "User stats retrieved successfully")
    );
});

export { logRecycling, getUserStats };
