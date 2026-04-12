function getDb() {
    return firebase.firestore();
}

function normalizeText(value) {
    return (value || "").trim();
}

function toDateValue(value) {
    if (!value) return new Date(0);
    if (typeof value.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function sortRowsByDateDesc(rows = [], dateField) {
    return [...rows].sort((left, right) => toDateValue(right?.[dateField]).getTime() - toDateValue(left?.[dateField]).getTime());
}

function filterRowsByWindow(rows = [], dateField, startDate, endDate = null) {
    if (!dateField || (!startDate && !endDate)) return rows;

    return rows.filter(row => {
        const time = toDateValue(row?.[dateField]).getTime();
        if (startDate && time < startDate.getTime()) return false;
        if (endDate && time > endDate.getTime()) return false;
        return true;
    });
}

async function fetchRowsWithFallback(path, {
    dateField = "",
    startDate = null,
    endDate = null,
    createdBy = "",
    maxDocs = 800
} = {}) {
    const db = getDb();

    try {
        let query = db.collection(path);

        if (createdBy) {
            query = query.where("createdBy", "==", createdBy);
        }

        if (dateField && startDate) {
            query = query.where(dateField, ">=", startDate);
        }

        if (dateField && endDate) {
            query = query.where(dateField, "<=", endDate);
        }

        if (dateField) {
            query = query.orderBy(dateField, "desc");
        }

        query = query.limit(maxDocs);

        const snapshot = await query.get();
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return {
            rows: dateField ? sortRowsByDateDesc(rows, dateField) : rows,
            truncated: snapshot.size >= maxDocs
        };
    } catch (error) {
        console.warn(`[Moneta] Reports query fallback for ${path}:`, error);

        const snapshot = await db.collection(path).limit(maxDocs).get();
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const scopedRows = createdBy
            ? rows.filter(row => normalizeText(row.createdBy) === createdBy)
            : rows;
        const windowedRows = filterRowsByWindow(scopedRows, dateField, startDate, endDate);

        return {
            rows: dateField ? sortRowsByDateDesc(windowedRows, dateField).slice(0, maxDocs) : windowedRows.slice(0, maxDocs),
            truncated: windowedRows.length >= maxDocs
        };
    }
}

export async function fetchReportWindowedRows(path, options = {}) {
    return fetchRowsWithFallback(path, options);
}
