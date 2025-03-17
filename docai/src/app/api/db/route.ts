import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/db";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ message: "Database connected successfully" });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 }
    );
  }
}
