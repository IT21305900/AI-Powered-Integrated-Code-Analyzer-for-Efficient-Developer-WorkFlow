import React from "react";

const CodeSmell = () => {
  return (
    <div className="p-6">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-3 w-1/3">
              Implementation Smell
            </th>
            <th className="border border-gray-300 p-3 w-1/3">Design Smell</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 p-3 align-top w-1/3">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">
                      Type
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Page
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Line
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Feedback
                    </th>
                  </tr>
                </thead>
              </table>
            </td>
            <td className="border border-gray-300 p-3 align-top">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">
                      Type
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Page
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Line
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">
                      Feedback
                    </th>
                  </tr>
                </thead>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CodeSmell;
