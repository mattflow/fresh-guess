import { Html, Head, Main, NextScript } from "next/document";
import clsx from "clsx";

const Document = () => {
  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default Document;
