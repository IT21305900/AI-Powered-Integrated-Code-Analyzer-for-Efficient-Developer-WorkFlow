import { getRepositoryFolderNames } from "@/lib/actions/repo.action";
import {
  Card,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle,
} from "../ui/card";
import IDENavigator from "./WorkSpaceDialog";
import Link from "next/link";

const Repositories = async () => {
  // const [selectedRepository, setSelectedRepository] = useState<string>("");
  // const router = useRouter();

  const data = (await getRepositoryFolderNames()) || [];

  // const handleRepositoryChange = (value: string) => {
  //   setSelectedRepository(selectedRepository);
  //   router.push(`/ide/?repository=${value}`);
  // };

  // const { data, isLoading, error } = useQuery({
  //   queryKey: ["repositories"],
  //   queryFn: ,
  // });

  // if (error) return <div>Error</div>;

  return (
    <div className="col-span-3 ">
      <Card className="rounded-md shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="card-header font-medium">
            Repositories
          </CardTitle>
        </CardHeader>

        <CardContent></CardContent>
        <CardContent>
          <div className="flex flex-col space-y-2">
            {data?.map((repo: { _id: string; name: string }) => (
              <Link key={repo._id} href={`?repository=${repo.name}`}>
                <IDENavigator>
                  <span
                    key={repo._id}
                    className="mb-2 text-left text-xl hover:text-blue-500 hover:underline cursor-pointer"
                  >
                    {repo.name}
                  </span>
                </IDENavigator>
              </Link>
            ))}
          </div>
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      {/* <label className="block text-sm font-medium mb-2">Repository</label>
      <Select onValueChange={handleRepositoryChange} value={selectedRepository}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>

        <SelectContent>
          {isLoading && <div>Loading</div>}
          {!isLoading &&
            data?.map((repo: { _id: string; name: string }) => (
              <SelectItem key={repo._id} value={repo.name}>
                {repo.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select> */}
    </div>
  );
};

export default Repositories;
