import { type NextPage } from "next";

import { api } from "../utils/api";

const Home: NextPage = () => {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });

  if (!hello.data) {
    return <h1>Loading...</h1>;
  }

  return <h1>{hello.data.greeting}</h1>;
};

export default Home;
