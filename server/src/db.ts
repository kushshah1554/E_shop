import mongoose from "mongoose";

export const connectToDatabase = async () => {
  await mongoose.connect(process.env.MONGO_URI!); 
  console.log("db connected");
};
