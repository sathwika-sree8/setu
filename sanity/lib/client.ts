import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Set to false if statically generating pages, using ISR or tag-based revalidation
})

// Helper function to check if Sanity is properly configured
export function isSanityReady() {
  try {
    // Check if required environment variables are present
    return !!(projectId && dataset);
  } catch {
    return false;
  }
}

// Helper function to get the client safely
export function getClient() {
  if (!isSanityReady()) {
    return null;
  }
  return client;
}
