import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const liveblocks = new Liveblocks({
  secret: process.env.LIVE_BLOCKS_SECRET_KEY!,
});

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
  const userId = 1;

  const session = liveblocks.prepareSession("user-1", {
    userInfo: {
      name: "",
      color: "blue",
    },
  });

  session.allow("*", session.FULL_ACCESS);

  const { body, status } = await session.authorize();

  return res.status(200).json({ token: JSON.parse(body).token });
}
