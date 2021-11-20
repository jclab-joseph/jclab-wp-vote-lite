export function sortByCreatedAt<T extends {createdAt: number | Date}> (list: T[]): T[] {
  return list.sort((x, y) => {
    const xt = (typeof x.createdAt === 'number') ? x.createdAt : x.createdAt.getTime();
    const yt = (typeof y.createdAt === 'number') ? y.createdAt : y.createdAt.getTime();
    if (xt < yt) return 1;
    else if (xt > yt) return -1;
    return 0;
  });
}
