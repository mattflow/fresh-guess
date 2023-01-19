import { type NextPage } from "next";
import algoliasearch from "algoliasearch/lite";
import {
  InstantSearch,
  SearchBox,
  useInfiniteHits,
  useInstantSearch,
} from "react-instantsearch-hooks-web";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";

import { api } from "../utils/api";
import { useEffect, useRef } from "react";

type Hit = {
  title: string;
  posterImageUrl?: string;
  releaseYear: string;
  rottenTomatoes?: {
    audienceScore?: number;
    audienceIconUrl?: string;
    criticsScore?: number;
    criticsIconUrl?: string;
  };
};
const Result = ({ hit }: { hit: Hit }) => {
  const audienceScore = hit.rottenTomatoes?.audienceScore
    ? hit.rottenTomatoes.audienceScore.toString()
    : "--";
  const audienceIconUrl = hit.rottenTomatoes?.audienceIconUrl
    ? hit.rottenTomatoes.audienceIconUrl
    : "/audience-score-empty.svg";
  const criticsScore = hit.rottenTomatoes?.criticsScore
    ? hit.rottenTomatoes.criticsScore.toString()
    : "--";
  const criticsIconUrl = hit.rottenTomatoes?.criticsIconUrl
    ? hit.rottenTomatoes.criticsIconUrl
    : "/critics-score-empty.svg";
  return (
    <div className="flex justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-4 truncate">
        <img
          src={hit.posterImageUrl || "/poster-default.gif"}
          className="h-auto w-20 shrink-0 rounded shadow"
        />
        <div className="truncate">
          <h1 className="truncate">{hit.title}</h1>
          <h2 className="text-sm text-gray-400">{hit.releaseYear}</h2>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <div className="space-y-1 font-mono text-sm font-semibold">
          <div className="flex items-center justify-end gap-2 rounded-full bg-gray-100 py-1 px-3">
            <span className={`${criticsScore === "--" && "text-gray-300"}`}>
              {criticsScore}
            </span>
            <img src={criticsIconUrl} className="h-auto w-5" />
          </div>
          <div className="flex items-center justify-end gap-2 rounded-full bg-gray-100 py-1 px-3">
            <span className={`${audienceScore === "--" && "text-gray-300"}`}>
              {audienceScore}
            </span>
            <img src={audienceIconUrl} className="h-auto w-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
const Results = () => {
  const { hits, isLastPage, showMore } = useInfiniteHits<Hit>();
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (sentinelRef.current !== null) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLastPage) {
            showMore();
          }
        });
      });

      observer.observe(sentinelRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [isLastPage, showMore]);

  return (
    <div className="max-h-[38rem] overflow-y-scroll rounded shadow">
      <ul className="divide-y divide-gray-200">
        {hits.map((hit) => (
          <li key={hit.objectID}>
            <Result hit={hit} />
          </li>
        ))}
        <li ref={sentinelRef} aria-hidden="true" />
      </ul>
    </div>
  );
};
const EmptyQueryBoundary = ({ children }: { children: JSX.Element }) => {
  const { indexUiState } = useInstantSearch();

  if (!indexUiState.query) {
    return null;
  }

  return children;
};

const Home: NextPage = () => {
  const hello = api.example.hello.useQuery();

  if (!hello.data) {
    return <h1>Loading...</h1>;
  }

  const searchClient = algoliasearch(hello.data.aId, hello.data.sId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <InstantSearch searchClient={searchClient} indexName="content_rt">
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </div>
            <SearchBox
              classNames={{
                input:
                  "block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                reset: "hidden",
                submit: "hidden",
                loadingIndicator: "hidden",
              }}
            />
          </div>
          <EmptyQueryBoundary>
            <Results />
          </EmptyQueryBoundary>
        </InstantSearch>
      </div>
    </div>
  );
};

export default Home;
