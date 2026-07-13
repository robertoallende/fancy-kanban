// Patches a mutated Board model back into the source file via the Vault API.
// Responsibilities:
//   - Locate the exact byte range of the block in the source file
//     (using the MarkdownPostProcessorContext's block position info)
//   - Serialize the updated Board to block text via serializer.ts
//   - Replace only that range — leave all surrounding file content untouched
//   - Use vault.process() for atomic read-modify-write to avoid race conditions
