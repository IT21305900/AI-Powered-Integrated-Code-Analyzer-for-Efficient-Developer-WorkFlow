import { getPipelineStats } from "@/lib/actions/documentstats.action";

export const GET = async (
    request: Request,
    { params }: { params: { repository: string } }
) => {
    console.log("Called")
    const stats = await getPipelineStats(params.repository);

    return Response.json(stats || {});
};


// import type { NextApiRequest, NextApiResponse } from 'next'

// export async function GET(req: NextApiRequest, res: NextApiResponse) {
//     console.log(req.query)

//     return Response.json({});
// }