export class NetworkStats {
    type? : string
    counters? : Map<string,number>
    load? : Map<string,number>
}

export class IP{
    ip? : string
    mask? : number
    net? : string
    netLong? : number
    broadLong? : number
    flagList? : string[]
}

export class Protocol {
    type? : string
    value? : Map<string, IP[]>
}

export class LogicalInterface {
    name? : string
    dscr? : string
    protocolList? : Protocol[]
    statsList? : NetworkStats[]
    mtu? : number
}

export class NetworkDevice {
    name? : string
    state? : Map<string,string>
    dscr? : string
    linkLevelType? : string
    mtu? : number
    speed? : number
    duplex? : string
    mac? : string
    clearing? : string
    statsList? : NetworkStats[]
    logIntList?: LogicalInterface[]
}