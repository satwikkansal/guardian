import { BlockModel } from "../models/block.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { Status } from "../types/status.type";
import { EventModel } from "../models/event.model";
import { PropertiesRate } from "./properties-rate";
import { EventsRate } from "./events-rate";
import { PermissionsRate } from "./permissions-rate";
import { ArtifactsRate } from "./artifacts-rate";
import { IRate } from "../interfaces/rate.interface";
import { ArtifactModel } from "../models/artifact.model";
import { Rate } from "./rate";
import { PropertyModel } from "../models/property.model";

export class BlocksRate extends Rate<BlockModel> {
    public blockType: string;

    public indexRate: number;
    public propertiesRate: number;
    public eventsRate: number;
    public permissionsRate: number;
    public artifactsRate: number;

    public children: BlocksRate[];
    public properties: PropertiesRate[];
    public events: EventsRate[];
    public permissions: PermissionsRate[];
    public artifacts: ArtifactsRate[];

    constructor(block1: BlockModel, block2: BlockModel) {
        super(block1, block2);
        this.indexRate = -1;
        this.propertiesRate = -1;
        this.eventsRate = -1;
        this.permissionsRate = -1;
        this.artifactsRate = -1;
        this.totalRate = -1;
        this.type = Status.NONE;
        this.children = [];
        this.properties = [];
        this.events = [];
        this.permissions = [];
        if (block1) {
            this.blockType = block1.blockType;
        } else if (block2) {
            this.blockType = block2.blockType;
        } else {
            throw new Error('Empty block model');
        }
    }

    private compareProp(block1: BlockModel, block2: BlockModel): void {
        const list: string[] = [];
        const map: any = {};

        let tag1: PropertyModel<any>;
        if (block1) {
            tag1 = new PropertyModel('tag', 'property', block1.tag, 1, 'tag');
            const list1 = block1.getPropList();
            for (const item of list1) {
                list.push(item.path);
                map[item.path] = [item, null];
            }
        }

        let tag2: PropertyModel<any>;
        if (block2) {
            tag2 = new PropertyModel('tag', 'property', block2.tag, 1, 'tag');
            const list2 = block2.getPropList();
            for (const item of list2) {
                if (map[item.path]) {
                    map[item.path][1] = item;
                } else {
                    list.push(item.path);
                    map[item.path] = [null, item];
                }
            }
        }

        list.sort();

        this.properties = [];
        for (const path of list) {
            this.properties.push(new PropertiesRate(map[path][0], map[path][1]));
        }

        this.properties.unshift(new PropertiesRate(tag1, tag2));
    }

    private comparePermissions(block1: BlockModel, block2: BlockModel): void {
        const list: string[][] = [];
        if (block1) {
            const list1 = block1.getPermissionsList();
            for (const item of list1) {
                list.push([item, null]);
            }
        }
        if (block2) {
            const list2 = block2.getPermissionsList();
            for (const item of list2) {
                this._mapping<string>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new PermissionsRate(item[0], item[1]));
        }
        this.permissions = rates;
    }

    private compareEvents(block1: BlockModel, block2: BlockModel): void {
        const list: EventModel[][] = [];
        if (block1) {
            const list1 = block1.getEventList();
            for (const item of list1) {
                list.push([item, null]);
            }
        }
        if (block2) {
            const list2 = block2.getEventList();
            for (const item of list2) {
                this._mapping<EventModel>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new EventsRate(item[0], item[1]));
        }
        this.events = rates;
    }

    private compareArtifacts(block1: BlockModel, block2: BlockModel): void {
        const list: ArtifactModel[][] = [];
        if (block1) {
            const list1 = block1.getArtifactsList();
            for (const item of list1) {
                list.push([item, null]);
            }
        }
        if (block2) {
            const list2 = block2.getArtifactsList();
            for (const item of list2) {
                this._mapping<ArtifactModel>(list, item);
            }
        }
        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new ArtifactsRate(item[0], item[1]));
        }
        this.artifacts = rates;
    }

    private _mapping<T>(list: T[][], item: T) {
        for (const el of list) {
            if (el[0] && !el[1] && this._equal(el[0], item)) {
                el[1] = item;
                return;
            }
        }
        list.push([null, item])
    }

    private _equal(e1: any, e2: any): boolean {
        if (typeof e1.equal === 'function') {
            return e1.equal(e2);
        }
        return e1 === e2;
    }

    private _calcRate<T>(rates: IRate<T>[]): number {
        let sum = 0;
        for (const item of rates) {
            if (item.totalRate > 0) {
                sum += item.totalRate;
            }
        }
        if (rates.length) {
            sum = sum / rates.length;
        } else {
            sum = 100;
        }
        sum = Math.min(Math.max(-1, Math.floor(sum)), 100);
        return sum;
    }

    public override calc(options: ICompareOptions): void {
        const block1 = this.left;
        const block2 = this.right;

        this.compareProp(block1, block2);
        this.compareEvents(block1, block2);
        this.comparePermissions(block1, block2);
        this.compareArtifacts(block1, block2);

        if (!block1 || !block2) {
            return;
        }

        this.indexRate = block1.index === block2.index ? 100 : 0;
        this.propertiesRate = this._calcRate(this.properties);
        this.eventsRate = this._calcRate(this.events);
        this.permissionsRate = this._calcRate(this.permissions);
        this.artifactsRate = this._calcRate(this.artifacts);

        this.totalRate = Math.floor((
            this.propertiesRate +
            this.eventsRate +
            this.permissionsRate +
            this.artifactsRate
        ) / 4);
    }

    public getSubRate(name: string): IRate<any>[] {
        if (name === 'properties' && this.properties) {
            return this.properties.map(p => p.toObject());;
        }
        if (name === 'events' && this.events) {
            return this.events.map(p => p.toObject());;
        }
        if (name === 'permissions' && this.permissions) {
            return this.permissions.map(p => p.toObject());;
        }
        if (name === 'artifacts' && this.artifacts) {
            return this.artifacts.map(p => p.toObject());;
        }
        return null;
    }

    public override getChildren<T extends IRate<any>>(): T[] {
        return this.children as any;
    }

    public override getRateValue(name: string): number {
        if (name === 'index') {
            return this.indexRate;
        }
        if (name === 'properties') {
            return this.propertiesRate;
        }
        if (name === 'events') {
            return this.eventsRate;
        }
        if (name === 'permissions') {
            return this.permissionsRate;
        }
        if (name === 'artifacts') {
            return this.artifactsRate;
        }
        return this.totalRate;
    }
}
