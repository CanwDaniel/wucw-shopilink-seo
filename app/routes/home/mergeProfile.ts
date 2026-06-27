export function mergeProfile(previousProfile: any, currentProfile: any) {
  return {
    ...previousProfile,
    ...currentProfile,
  };
}