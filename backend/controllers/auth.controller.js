import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token.js";
export const register = async (req, res) => {
  const { email, name, password, avatar } = req.body;
  try {
    //check  if it already exists
    let user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    //create new user
    user = new User({
      email,
      password,
      name,
      avatar: avatar || "",
    });

    //hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    //save user
    await user.save();

    //gen token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    //find user by email
    const user=await User.findOne({email});
    if(!user){
        res.status(400).json({success:false,message:"Invalid Credentials"});
        return;
    }
   
    //compare passwords

    const isMatch=await bcrypt.compare(password,user.password);
    if(!isMatch){
        res.status(400).json({success:false,msg:"Invalid Credentials"});
        return;
    } 

    //gen token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
