import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generatAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken(userId)
        const refreshToken = user.generateRefreshToken(userId)

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    }catch{
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message:"OK"
    // })

    // get data from the client
    // validation - not empty
    // check user exist : username, email
    // check for images and avtar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation done or not
    // return response

    const {fullName, email, username, password} = req.body;
    console.log("email: ",email," username:",username);

    // if(fullName===""){
    //     throw new ApiError(400, "Fullname is required")
    // }

    if(
        [fullName, email, username, password].some((field)=> field?.trim()==="") // can also use map instead of sum
    ){
        throw new ApiError(400, "All fields are required")
    }
    // User.findOne({emai});

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    });

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }
    
    console.log("Upload avatar to cloudinary");
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("Upload cover Image to cloudinary");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})

const loginUser = asyncHandler(async(req, res)=>{
    // get username and password from user
    // search the user in db, if found apply password bcrypt and match it with db
    // if match login successful
    // if not login fail
    // successful login pass all user info

    // ========================
    // req body -> data
    // username or email
    // find user
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body
    if(!username && !email){
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User doesn't exist")
    }

    const isPasswordValid = user.isPasswordCorrect(password);

    const {accessToken, refreshToken} = await generatAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json( new ApiResponse(200,{user: loggedInUser,accessToken,refreshToken}, "User Logged In successfully"))
})


const logoutUser = asyncHandler(async(req,res)=> {
    
    User.findByIdAndUpdate(req.user._id,{
            $set:{refreshToken:undefined}
        },{
            new: true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User Logges Out Successfully "))

})

const refreshAccessToken = asyncHandler(async(req,res)=> {
    const incomingRefreshToken = req.cookie.accessToken || req.body.accessToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")

    }
    try {
    
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken, refreshToken} = await generatAccessAndRefreshToken(user._id)
    
        return res.status(200)
                .cookie("accessToken",accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(new ApiResponse(200,{accessToken,refreshToken},"Access Token Refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body;

    if((oldPassword===newPassword)){
        throw new ApiError(400, "Old Password and New Password cannot be same ");
    }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave:false })

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,resp)=>{
    return res.status(200).json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    User.findByIdAndUpdate(
        req.user?._id,
        {$set:{
            fullName,
            email:email
        }},
        {new:true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Account details stored successfully"))
})

const upateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.files?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    
    return res
    .status(200)
    .json(
        new ApiResponse(200,user, "Avatar updated successfully")
    )
})

const upateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.files?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "CoverImage file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on coverImage")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    //delete old image code

    return res
    .status(200)
    .json(
        new ApiResponse(200,user, "CoverImage updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params 
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "Subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },{
            $lookup:{
                from:"Subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribedTo:{
                    $cond:{
                        if:{ $in: [req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                coverImage:1,
                avatar:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"Channel Does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully") 
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchhistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        userName:1,
                                        avatar:1
                                    }
                                }
                            ]

                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]

            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully"))
})
export {registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    upateUserAvatar,
    upateUserCoverImage,
    getUserChannelProfile
}
