import {
    createCategoryRecord,
    createPaymentModeRecord,
    createSeasonRecord,
    getCategoryUsageStatus,
    getPaymentModeUsageStatus,
    getSeasonUsageStatus,
    setCategoryActiveStatus,
    setPaymentModeActiveStatus,
    setSeasonActiveStatus,
    updateCategoryRecord,
    updatePaymentModeRecord,
    updateSeasonRecord
} from "./repository.js";

const SEASON_STATUSES = ["Upcoming", "Active", "Archived"];

function normalizeText(value) {
    return (value || "").trim();
}

function findDuplicate(records, field, value, docId) {
    return (records || []).find(record =>
        normalizeText(record[field]).toLowerCase() === normalizeText(value).toLowerCase()
        && record.id !== docId
    ) || null;
}

function parseDateInput(value, label) {
    const input = normalizeText(value);

    if (!input) {
        throw new Error(`${label} is required.`);
    }

    const date = new Date(`${input}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} is invalid.`);
    }

    return date;
}

async function ensureCategoryIsEditable(docId, existingCategories = []) {
    const currentRecord = (existingCategories || []).find(record => record.id === docId) || null;

    if (!currentRecord) {
        throw new Error("Category record could not be found.");
    }

    const usage = await getCategoryUsageStatus(docId);
    if (usage.isUsed) {
        throw new Error(usage.message);
    }

    return currentRecord;
}

async function ensureSeasonIsEditable(docId, existingSeasons = []) {
    const currentRecord = (existingSeasons || []).find(record => record.id === docId) || null;

    if (!currentRecord) {
        throw new Error("Season record could not be found.");
    }

    const usage = await getSeasonUsageStatus(docId);
    if (usage.isUsed) {
        throw new Error(usage.message);
    }

    return currentRecord;
}

async function ensurePaymentModeIsEditable(docId, existingPaymentModes = []) {
    const currentRecord = (existingPaymentModes || []).find(record => record.id === docId) || null;

    if (!currentRecord) {
        throw new Error("Payment mode record could not be found.");
    }

    const usage = await getPaymentModeUsageStatus(currentRecord.paymentMode);
    if (usage.isUsed) {
        throw new Error(usage.message);
    }

    return currentRecord;
}

export function validateCategoryPayload(payload, existingCategories = []) {
    const docId = normalizeText(payload.docId);
    const categoryName = normalizeText(payload.categoryName);

    if (!categoryName) {
        throw new Error("Category name is required.");
    }

    if (categoryName.length < 2) {
        throw new Error("Category name must be at least 2 characters long.");
    }

    if (categoryName.length > 50) {
        throw new Error("Category name must be 50 characters or less.");
    }

    const duplicate = findDuplicate(existingCategories, "categoryName", categoryName, docId);
    if (duplicate) {
        throw new Error(`Category "${duplicate.categoryName}" already exists.`);
    }

    return { docId, categoryName };
}

export async function saveCategory(payload, user, existingCategories = []) {
    if (!user) {
        throw new Error("You must be logged in to save a category.");
    }

    const { docId, categoryName } = validateCategoryPayload(payload, existingCategories);

    if (docId) {
        await ensureCategoryIsEditable(docId, existingCategories);
        await updateCategoryRecord(docId, { categoryName }, user);
        return { mode: "update" };
    }

    await createCategoryRecord({ categoryName }, user);
    return { mode: "create" };
}

export async function toggleCategoryStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update category status.");
    }

    if (!docId) {
        throw new Error("Category record could not be found.");
    }

    await setCategoryActiveStatus(docId, nextValue, user);
}

export function validatePaymentModePayload(payload, existingPaymentModes = []) {
    const docId = normalizeText(payload.docId);
    const paymentMode = normalizeText(payload.paymentMode);

    if (!paymentMode) {
        throw new Error("Payment mode name is required.");
    }

    if (paymentMode.length < 2) {
        throw new Error("Payment mode name must be at least 2 characters long.");
    }

    if (paymentMode.length > 30) {
        throw new Error("Payment mode name must be 30 characters or less.");
    }

    const duplicate = findDuplicate(existingPaymentModes, "paymentMode", paymentMode, docId);
    if (duplicate) {
        throw new Error(`Payment mode "${duplicate.paymentMode}" already exists.`);
    }

    return { docId, paymentMode };
}

export async function savePaymentMode(payload, user, existingPaymentModes = []) {
    if (!user) {
        throw new Error("You must be logged in to save a payment mode.");
    }

    const { docId, paymentMode } = validatePaymentModePayload(payload, existingPaymentModes);

    if (docId) {
        await ensurePaymentModeIsEditable(docId, existingPaymentModes);
        await updatePaymentModeRecord(docId, { paymentMode }, user);
        return { mode: "update" };
    }

    await createPaymentModeRecord({ paymentMode }, user);
    return { mode: "create" };
}

export async function togglePaymentModeStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update payment mode status.");
    }

    if (!docId) {
        throw new Error("Payment mode record could not be found.");
    }

    await setPaymentModeActiveStatus(docId, nextValue, user);
}

export function validateSeasonPayload(payload, existingSeasons = []) {
    const docId = normalizeText(payload.docId);
    const seasonName = normalizeText(payload.seasonName);
    const status = SEASON_STATUSES.includes(normalizeText(payload.status))
        ? normalizeText(payload.status)
        : "Upcoming";
    const startDate = parseDateInput(payload.startDate, "Start date");
    const endDate = parseDateInput(payload.endDate, "End date");

    if (!seasonName) {
        throw new Error("Season name is required.");
    }

    if (seasonName.length < 3) {
        throw new Error("Season name must be at least 3 characters long.");
    }

    if (seasonName.length > 60) {
        throw new Error("Season name must be 60 characters or less.");
    }

    if (startDate.getTime() > endDate.getTime()) {
        throw new Error("Start date must be before or equal to the end date.");
    }

    const duplicate = findDuplicate(existingSeasons, "seasonName", seasonName, docId);
    if (duplicate) {
        throw new Error(`Season "${duplicate.seasonName}" already exists.`);
    }

    return {
        docId,
        seasonName,
        startDate,
        endDate,
        status
    };
}

export async function saveSeason(payload, user, existingSeasons = []) {
    if (!user) {
        throw new Error("You must be logged in to save a season.");
    }

    const { docId, ...seasonData } = validateSeasonPayload(payload, existingSeasons);

    if (docId) {
        await ensureSeasonIsEditable(docId, existingSeasons);
        await updateSeasonRecord(docId, seasonData, user);
        return { mode: "update" };
    }

    await createSeasonRecord(seasonData, user);
    return { mode: "create" };
}

export async function toggleSeasonStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update season status.");
    }

    if (!docId) {
        throw new Error("Season record could not be found.");
    }

    await setSeasonActiveStatus(docId, nextValue, user);
}

export async function getAdminEditRestriction(entity, record) {
    if (!record?.id) {
        return {
            isLocked: true,
            message: "Admin record could not be found."
        };
    }

    if (entity === "categories") {
        const usage = await getCategoryUsageStatus(record.id);
        return {
            isLocked: usage.isUsed,
            message: usage.message || ""
        };
    }

    if (entity === "seasons") {
        const usage = await getSeasonUsageStatus(record.id);
        return {
            isLocked: usage.isUsed,
            message: usage.message || ""
        };
    }

    if (entity === "paymentModes") {
        const usage = await getPaymentModeUsageStatus(record.paymentMode);
        return {
            isLocked: usage.isUsed,
            message: usage.message || ""
        };
    }

    return {
        isLocked: false,
        message: ""
    };
}
