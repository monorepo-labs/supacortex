import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next";

const withMDX = createMDX()

const nextConfig: NextConfig = {
  /* config options here */
};

export default withMDX(nextConfig);
