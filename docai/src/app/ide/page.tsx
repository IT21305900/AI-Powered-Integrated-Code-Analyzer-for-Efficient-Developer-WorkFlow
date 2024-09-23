import React from "react";

const page = async ({
  searchParams,
}: {
  searchParams?: {
    repository?: string;
  };
}) => {
  const { repository }: any = await searchParams;

  return (
    <div className="bg-black text-slate-200">
      <div className="flex flex-col h-[90vh] justify-center items-center space-y-2">
        <div className="min-w-[300px]"></div>
      </div>
    </div>
  );
};

export default page;
