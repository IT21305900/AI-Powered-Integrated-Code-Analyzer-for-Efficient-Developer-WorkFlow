"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { toast } from "sonner";
import { saveDocumentation } from "@/lib/actions/documentation.action";
import { Loader2, Save, FileCheck } from "lucide-react";

const Editor = () => {
  const searchParams = useSearchParams();
  const repository = searchParams.get("repository");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

  useEffect(() => {
    if (!repository) return;

    setLoading(true);
    // Fetch the markdown file content
    fetch(`/${repository}/${repository}.md`)
      .then((response) => {
        if (!response.ok) {
          toast.error("Failed to load documentation file.");
          throw new Error("Failed to load documentation");
        }
        return response.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading documentation:", error);
        setLoading(false);
        toast.error("Error loading documentation file");
      });
  }, [repository]);

  const handleSave = async () => {
    if (!repository) {
      toast.error("Repository name is required");
      return;
    }

    setSaving(true);
    try {
      await saveDocumentation(repository, content);
      toast.success("Documentation saved successfully");
      // Optional: Refresh from server to ensure we have the latest version
      // const response = await fetch(`/${repository}/${repository}.md`);
      // const freshContent = await response.text();
      // setContent(freshContent);
    } catch (error) {
      console.error("Error saving documentation:", error);
      toast.error("Failed to save documentation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-200">Loading documentation...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-100">
          Edit Documentation
        </h2>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs
        defaultValue="edit"
        className="w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 rounded-sm">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4 rounded-sm">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[500px] font-mono text-sm p-4 bg-zinc-900 text-gray-100 rounded-sm"
            placeholder="# Your Markdown Content Here"
          />
          <div className="mt-2 text-sm text-gray-400">
            <span>
              Supports Markdown syntax, including code blocks, tables, and
              lists.
            </span>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card className="p-6 bg-gray-800 border-gray-700 min-h-[500px] overflow-auto">
            <div className="prose prose-invert prose-sm sm:prose-invert lg:prose-lg max-w-none text-gray-100">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // @ts-ignore
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
                  // All other styled markdown components from your existing ReactMarkdown
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
                {content}
              </ReactMarkdown>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Editor;
