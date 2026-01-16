import crypto from "crypto";
import { insertBranch, getBranchById, listAllBranches, updateBranchRepo } from "./branchRepository.js";

export function createBranch({ name, address })
{
    if (!name || !address)
    {
        throw new Error("Branch name and address are required");
    }

    const branchId = crypto.randomUUID();
    const now = Date.now();

    const branch = {
        id: branchId,
        name,
        address,
        createdAt: now,
    };

    insertBranch(branch);
    return branch;
}

export function getBranch(branchId)
{
    const branch = getBranchById(branchId);
    if (!branch)
    {
        throw new Error("Branch not found");
    }
    return branch;
}

export function listBranches()
{
    return listAllBranches();
}

export function updateBranch({ branchId, name, address })
{
    const branch = getBranchById(branchId);
    if (!branch)
    {
        throw new Error("Branch not found");
    }

    const result = updateBranchRepo({
        branchId,
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
    });

    return result;
}

export async function assertBranchExists(branchId)
{
    const branch = await getBranchById(branchId);
    if (!branch)
    {
        throw new Error(`Branch ${branchId} does not exist`);
    }
}
