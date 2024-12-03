import React, { Suspense } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldType, CustomProps } from "@/lib/types";
import { getRepositoryFolderNames } from "@/lib/filesystem";
import { isErrored } from "stream";
// import { useQuery } from "@tanstack/react-query";
// import UploadWidget from "../common/upload/UploadWidget";

const RenderInput = ({ field, props }: { field: any; props: any }) => {
  switch (props.fieldType) {
    case FormFieldType.INPUT:
      return (
        <div className="flex rounded-none border border-dark-500 bg-dark-400">
          {props.iconSrc && (
            <Image
              src={props.iconSrc}
              height={24}
              width={24}
              alt={props.iconAlt || "icon"}
              className="ml-2"
            />
          )}
          <FormControl>
            <Input
              placeholder={props.placeholder}
              {...field}
              className="border-0 rounded-none"
            />
          </FormControl>
        </div>
      );
    case FormFieldType.PHONE:
      return (
        <div className="flex rounded-none border border-dark-500 bg-dark-400">
          {props.iconSrc && (
            <Image
              src={props.iconSrc}
              height={24}
              width={24}
              alt={props.iconAlt || "icon"}
              className="ml-2"
            />
          )}
          <FormControl>
            <Input
              placeholder={props.placeholder}
              {...field}
              className="border-0 rounded-none"
            />
          </FormControl>
        </div>
      );
    case FormFieldType.NUMBER:
      return (
        <div className="flex rounded-none border border-dark-500 bg-dark-400">
          <FormControl>
            <Input
              type="number"
              placeholder={props.placeholder}
              {...field}
              className="shad-input border-0"
            />
          </FormControl>
        </div>
      );
    case FormFieldType.CLOUD_UPLOAD:
      return (
        <FormControl>
          {/* <UploadWidget onUpload={(url: string) => field.onChange(url)} /> */}
        </FormControl>
      );
    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            placeholder={props.placeholder}
            className="rounded-none"
            {...field}
            disabled={props.disabled}
          />
        </FormControl>
      );
    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="shad-select-trigger rounded-none">
                <SelectValue placeholder={props.placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="shad-select-content rounded-none">
              {props.children}
            </SelectContent>
          </Select>
        </FormControl>
      );
    // case FormFieldType.SELECT_REPOSITORY:
    //   return (
    //     <FormControl>
    //       <Select
    //         disabled={props.disabled}
    //         onValueChange={field.onChange}
    //         defaultValue={field.value}
    //       >
    //         <FormControl>
    //           <SelectTrigger className="shad-select-trigger rounded-none">
    //             <SelectValue placeholder={props.placeholder} />
    //           </SelectTrigger>
    //         </FormControl>

    //         <SelectContent className="shad-select-content rounded-none">
    //           {/* <ListHospitals /> */}
    //           <ListRepositories />
    //         </SelectContent>
    //       </Select>
    //     </FormControl>
    //   );
  }
};

// const ListRepositories = () => {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ["repositories"],
//     queryFn: async () => {
//       const response = await getRepositoryFolderNames();

//       if (!response) {
//         throw new Error("Failed to fetch hospitals");
//       }

//       return response;
//     },
//   });

//   if (isLoading) {
//     return <div className="px-2 py-1">Loading</div>;
//   }

//   if (error) {
//     return <div className="px-2 py-1">Error Occured</div>;
//   }

//   return (
//     <>
//       {data?.map((hospital: any, index: number) => (
//         <SelectItem key={hospital + index} value={hospital.hospital}>
//           <div className="flex cursor-pointer items-center gap-2">
//             <p>{data}</p>
//           </div>
//         </SelectItem>
//       ))}
//     </>
//   );
// };

const CustomFormField = (props: CustomProps) => {
  const { control, name, label, disabled } = props;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1">
          {props.fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel className="shad-input-label">{label}</FormLabel>
          )}
          <RenderInput field={field} props={props} />

          <FormMessage className="shad-error" />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;
function useQuery(arg0: { queryKey: string[]; queryFn: () => Promise<any> }): {
  data: any;
  isLoading: any;
  error: any;
} {
  throw new Error("Function not implemented.");
}
