interface Model { maKx: string; tenKx: string }
interface Source { maPtlh: string }

export function shuffleCrmSources<T extends { source: string; isImported?: boolean; isSelected?: boolean }>(rows: T[], sources: Source[], random = Math.random): T[] {
    const codes = [...new Set(sources.map(source => source.maPtlh).filter(Boolean))];
    if (!codes.length) return rows;
    let bag: string[] = [], previous = '';
    return rows.map(row => {
        if (row.isImported || row.isSelected === false) return row;
        if (!bag.length) {
            bag = [...codes];
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
            if (bag.length > 1 && bag[0] === previous) [bag[0], bag[1]] = [bag[1], bag[0]];
        }
        const source = bag.shift()!;
        previous = source;
        return { ...row, source };
    });
}
export const crmModelFamily = (model: Model): string => {
    const name = model.tenKx.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const vf = name.match(/\bVF\s*(\d+)\b/);
    if (vf) return 'VF ' + vf[1];
    for (const family of ['EC VAN', 'MINIO', 'LIMO', 'HERIO', 'NERIO']) if (name.includes(family)) return family;
    return model.maKx;
};
/** Shuffle model families in balanced rounds. Preserve every other customer field. */
export function shuffleCrmModels<T extends {model: string; isImported?: boolean; isSelected?: boolean}>(rows: T[], models: Model[], random = Math.random): T[] {
    const unique = [...new Map(models.filter(m => m.maKx).map(m => [m.maKx, m])).values()];
    if (!unique.length) return rows;
    const groups = new Map<string, Model[]>();
    unique.forEach(m => {const key=crmModelFamily(m);groups.set(key,[...(groups.get(key)||[]),m]);});
    const shuffle = <U,>(items: U[]) => {const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
    const families=[...groups.keys()];let bag:string[]=[],previous='';const variants=new Map<string,Model[]>();
    return rows.map(row => {
        if (row.isImported || row.isSelected === false) return row;
        if (!bag.length) {
            bag=shuffle(families);
            if(bag.length>1&&bag[0]===previous)[bag[0],bag[1]]=[bag[1],bag[0]];
        }
        const family=bag.shift()!;previous=family;
        let choices=variants.get(family)||[];
        if(!choices.length)choices=shuffle(groups.get(family)!);
        const model=choices.shift()!;variants.set(family,choices);
        return {...row,model:model.maKx};
    });
}
