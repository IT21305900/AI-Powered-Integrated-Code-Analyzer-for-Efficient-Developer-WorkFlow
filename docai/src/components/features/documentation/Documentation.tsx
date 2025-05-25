"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { toast } from "sonner";
import DependencyGraph from "./DependencyGraph";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Button } from "@/components/ui/button";
import Editor from "./MarkdownEditor";
import { useUser } from "@clerk/nextjs";

const Documentation = () => {
  const searchParams = useSearchParams();


  const [select, setSelect] = useState<string>("markdown");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const repository = searchParams.get("repository");

  const [markdownContent, setMarkdownContent] = useState("");

  useEffect(() => {
    if (!repository) return;

    setLoading(true);
    // Fetch the markdown file content
    fetch(`/${repository}/${repository}.md`)
      .then((response) => {
        if (!response.ok) {
          toast.error(
            "Sorry, we didn't find documentation for the selected repository."
          );
          throw new Error("Not Found");
        }
        return response.text();
      })
      .then((text) => {
        setMarkdownContent(text);
        setLoading(false);
      })
      .catch((error) => {
        setError(true);
        setLoading(false);
      });
  }, [repository]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-gray-700 py-1 pt-4">
        <p className="lead mx-5 text-xl text-gray-100">
          Documentation for {repository} Repository
        </p>
      </div>

      <div className="flex mt-2">
        <Button
          onClick={() => setSelect("markdown")}
          className="rounded-none w-full"
        >
          Documentation
        </Button>
        <Button
          onClick={() => setSelect("editor")}
          className="rounded-none w-full"
        >
          Editor
        </Button>
        <Button
          onClick={() => setSelect("graph")}
          className="rounded-none w-full"
        >
          Build Graph
        </Button>
        <Button
          onClick={() => setSelect("export")}
          className="rounded-none w-full"
        >
          Export
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400"></div>
        </div>
      ) : error ? (
        <div className="m-10 text-center font-medium text-gray-200">
          <p>
            No documentation found for the selected {repository} project
            repository
          </p>

          <p className="mt-2 text-gray-400">
            You can run the documentation generation pipeline to generate
            documentation
          </p>
        </div>
      ) : (
        <div className="prose prose-invert prose-sm sm:prose-invert lg:prose-lg xl:prose-xl max-w-none px-5 py-6 markdown-content text-gray-100">
          {select === "markdown" && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]} // Supports tables, strikethrough, etc.
              rehypePlugins={[rehypeRaw]} // Allows HTML in markdown
              components={{
                //@ts-ignore
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      // @ts-ignore
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        borderRadius: "0.375rem",
                        margin: "1.5rem 0",
                        padding: "1rem",
                        backgroundColor: "rgb(30, 30, 30)",
                        border: "1px solid rgb(64, 64, 64)",
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className={`${className} bg-gray-800 text-gray-200 px-1 py-0.5 rounded`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Enhanced components for dark theme
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-3xl font-bold mt-8 mb-4 text-gray-100"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-2xl font-bold mt-6 mb-3 text-gray-100"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-xl font-bold mt-4 mb-2 text-gray-200"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p className="my-4 text-gray-300" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-400 hover:text-blue-300 underline"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc pl-6 my-4 text-gray-300"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal pl-6 my-4 text-gray-300"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="my-1 text-gray-300" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-6">
                    <table
                      className="min-w-full divide-y divide-gray-700 border border-gray-700"
                      {...props}
                    />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th
                    className="px-4 py-2 bg-gray-800 text-gray-200 text-left font-medium"
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td
                    className="px-4 py-2 border-t border-gray-700 text-gray-300"
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-400"
                    {...props}
                  />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-6 border-gray-700" {...props} />
                ),
                img: ({ node, ...props }) => (
                  <img
                    className="max-w-full h-auto rounded-md my-4"
                    {...props}
                  />
                ),
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          )}

          {select === "editor" && <Editor />}
          {select === "graph" && <DependencyGraph repository={repository!} />}
        </div>
      )}
    </div>
  );
};

export default Documentation;

// "use client";
// import { useSearchParams } from "next/navigation";
// import React, { useEffect, useState } from "react";
// import ReactMarkdown from "react-markdown";
// import { toast } from "sonner";
// import DependencyGraph from "./DependencyGraph";

// const Documentation = () => {
//   const searchParams = useSearchParams();
//   const [error, setError] = useState(false);
//   const repository = searchParams.get("repository");

//   const [markdownContent, setMarkdownContent] = useState("");

//   useEffect(() => {
//     // Fetch the markdown file content
//     fetch(`/${repository}/${repository}.md`)
//       .then((response) => {
//         if (!response.ok) {
//           toast.error(
//             "Sorry, we didn't found documentation for the selected repository."
//           );

//           throw new Error("Not Found");
//         }
//         return response.text();
//       })
//       .then((text) => setMarkdownContent(text))
//       .catch((error) => {
//         setError(true);
//       });
//   }, []);

//   return (
//     <div>
//       <div className="border-b py-1">
//         <p className="lead mx-5">Documentation for {repository} Repository</p>
//       </div>

//       <DependencyGraph repository={repository!} />

//       {error ? (
//         <div className="m-10 text-center font-medium">
//           <p className="">
//             Not Found Documentation for the selected {repository} project
//             repository
//           </p>

//           <p className="">
//             You can run the documentation generation pipeline to generate
//             documentation
//           </p>
//         </div>
//       ) : (
//         <ReactMarkdown>{markdownContent}</ReactMarkdown>
//       )}
//     </div>
//   );
// };

// export default Documentation;
