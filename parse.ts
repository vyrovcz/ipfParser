import { count } from 'console';
import { 
    NetworkDevice, 
    NetworkStats, 
    IP, 
    Protocol, 
    LogicalInterface } from './NetworkDevice';

enum StatType{
    none,
    phyIFtraffic,
    phyIFinErr,
    phyIFoutErr,
    logIFtraffic,
    logIFlocal,
    logIFtransit,
    logIFbundle
}

enum ProtoMode{
    none,
    inet,
    iso,
    mpls
}

export function parse(ifDump : string[]){

    let nd = new NetworkDevice()
    let statType = StatType.none

    let counters = new Map<string,number>()
    let load = new Map<string,number>()
    let statsList : NetworkStats[] = []

    let logIFs : LogicalInterface[] = []
    let logIF = new LogicalInterface()

    let protoMode = ProtoMode.none
    let proto = new Protocol()
    let protoList : Protocol[] = []
    let ip = new IP()
    let iplist : IP[] = []
    let flags : string[] = []
    let statsCounter = 0
    
    ifDump.forEach(line => {

        //console.log(line)

        // skip section, this is a list of REs to skip
        let skipRE = [/\(LSI\) traffic statistics:/]
        for (let sRE of skipRE)
            if (sRE.test(line)){
                statType = StatType.none
                return
            }

        let re = /(P|p)hysical interface/
        if(re.test(line)){
            nd.name = line.split(' ').at(2)?.slice(0,-1)
            let NDState = new Map<string,string>()
            re = /(E|e)nabled/
            NDState.set("admin", re.test(line) ? "enabled" : "disabled")
            re = /hysical link is (U|u)p/
            NDState.set("link", re.test(line) ? "up" : "down")
            nd.state = NDState
        }

        re = /(D|d)escription/
        if(re.test(line) && statType == StatType.none)
            nd.dscr = line.split(": ").at(1)

        re = /(L|l)ink-level type/
        if(re.test(line)){
            nd.linkLevelType = line.split("ink-level type: ").at(1)?.split(',').at(0)?.toLocaleLowerCase()
            nd.mtu = Number(line.split("MTU: ").at(1)?.split(',').at(0))
            let speed = Number(line.split("Speed: ").at(1)?.split(',').at(0)?.slice(0,-4))
            let speedmultiplier = line.split("Speed: ").at(1)?.split(',').at(0)?.slice(-4)
            switch (speedmultiplier) {
                case "kbps":
                    speed *= 1000
                    break;
                case "mbps":
                    speed *= 1000000
                    break;
                case "Gbps":
                    speed *= 1000000000
                    break;
            }
            nd.speed = Number(speed)
            nd.duplex = line.includes("Full-duplex") ? "full" : 
                line.includes("Half-duplex") ? "half" : undefined
        }
        re = /(H|h)ardware address/
        if(re.test(line)){
            let mac = line.split("ardware address: ").at(1)?.split(':')
            nd.mac = ""+mac?.at(0)+mac?.at(1)+"."+mac?.at(2)+mac?.at(3)+"."+mac?.at(4)+mac?.at(5)
        }
        re = /tatistics last cleared/
        if(re.test(line))
            nd.clearing = line.split(": ").at(1)?.toLowerCase()

        // starting and initializing a new statistic parsing session
        re = /raffic statistics/
        if(re.test(line) && statType == StatType.none){
            counters = new Map<string,number>()
            load = new Map<string,number>()

            statType = StatType.phyIFtraffic
        }

        if(statType == StatType.phyIFtraffic){
            // Converting lines of type "   Input  bytes  :             num1                  num2 bps":
            // "             num1                  num2 bps" (split on char ':')
            // " num1 num2 bps" (replace multi spaces with one space)
            // [ '', 'num1', 'num2', 'bps' ] (split on whitespace)
            re = /(I|i)nput +bytes/
            if(re.test(line)){
                counters.set("inBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                load.set("inBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[2])/8)
            }
            re = /(O|o)utput +bytes/
            if(re.test(line)){
                counters.set("outBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                load.set("outBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[2])/8)
            }
            re = /(I|i)nput +packets/
            if(re.test(line)){
                counters.set("inPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                load.set("inPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[2]))
            }
            re = /(O|o)utput +packets/
            if(re.test(line)){
                counters.set("outPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                load.set("outPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[2]))
            }
        }

        re = /nput errors/
        if(re.test(line)){
            // store the previously collected stats of type traffic
            statsList.push(new NetworkStats())
            statsList[statsCounter].type = "traffic"
            statsList[statsCounter].counters = counters
            statsList[statsCounter].load = load

            // initialize for next stats type
            counters = new Map<string,number>()
            load = new Map<string,number>()

            statType = StatType.phyIFinErr
            statsCounter++
        }

        if(statType == StatType.phyIFinErr){
            re = /Errors:/
            if(re.test(line))
                counters.set("inErr", Number(line.split("Errors:")[1].split(',')[0]))
            re = /Drops:/
            if(re.test(line))
                counters.set("inDrops", Number(line.split("Drops:")[1].split(',')[0]))
        }

        re = /utput errors/
        if(re.test(line)){
            // store the previously collected stats
            statsList.push(new NetworkStats())
            statsList[statsCounter].type = "inErrors"
            statsList[statsCounter].counters = counters

            // initialize for next stats type
            counters = new Map<string,number>()
            load = new Map<string,number>()

            statType = StatType.phyIFoutErr
            statsCounter++
        }

        if(statType == StatType.phyIFoutErr){
            re = /Errors:/
            if(re.test(line))
                counters.set("outErr", Number(line.split("Errors:")[1].split(',')[0]))
            re = /Drops/
            if(re.test(line))
                counters.set("outDrops", Number(line.split("Drops:")[1].split(',')[0]))
        }

        re = /(L|l)ogical interface/
        if(re.test(line)){
            // store the previously collected stats, in case they weren't yet
            if (nd.statsList == undefined){
                statsList.push(new NetworkStats())
                statsList[statsCounter].type = "outErrors"
                statsList[statsCounter].counters = counters
                nd.statsList = statsList
            }

            // initialize for next stats type
            counters = new Map<string,number>()
            load = new Map<string,number>()
            statsCounter = 0

            // a new log IF starts, store the old one
            logIF.protocolList = protoList
            logIF.statsList = statsList
            logIFs.push(logIF)

            // init new logIF
            logIF = new LogicalInterface()
            proto = new Protocol()
            protoList = []
            ip = new IP()

            statsList = []
            flags = []

            // stats are now counted towards the logical IF
            statType = StatType.logIFtraffic

            logIF.name = line.replace(/  +/g, ' ').split(' ')[3]
        }

        // only focus on lines after a logical IF declaration
        if (statType == StatType.logIFlocal || 
            statType == StatType.logIFtraffic || 
            statType == StatType.logIFtransit ||
            statType == StatType.logIFbundle){

            re = /(D|d)escription/
            if(re.test(line))
                logIF.dscr = line.split(": ").at(1)

            re = /(P|p)rotocol inet/
            if (re.test(line)){
                protoMode = ProtoMode.inet
                logIF.mtu = Number(line.split("MTU: ")[1].split(',')[0])
                proto.type = "inet"
            }

            re = /, Flags:/
            if (re.test(line) && protoMode == ProtoMode.inet){
                line.split("Flags: ")[1].split(' ')
                    .forEach(flag => flags.push(flag.toLocaleLowerCase()))
                ip.flagList = flags
            }

            re = /Destination.*Local/
            if (re.test(line) && protoMode == ProtoMode.inet){
                ip.ip = line.split("Local: ")[1].split(',')[0]
                ip.mask = Number(line.split('/')[1].split(',')[0])
                ip.net = line.split("Destination: ")[1].split(',')[0]
                ip.netLong = ip.net.split('/')[0].split('.')
                    .reduce((acc, next) => acc*256 + +next, 0) // inspired by https://gist.github.com/jppommet/5708697?permalink_comment_id=4100281#gistcomment-4100281 
                ip.broadLong = ip.netLong + Math.pow(2,32-ip.mask) - 1
                // last of current protocol
                iplist.push(ip)
                proto.value = new Map<string, IP[]>().set("iplist", iplist)
                protoList.push(proto)
                // init new
                proto = new Protocol()
            }

            re = /(P|p)rotocol iso/
            if (re.test(line)){

                protoMode = ProtoMode.iso
                proto.type = "iso"
                protoList.push(proto)
                // init new
                proto = new Protocol()
            }

            re = /(P|p)rotocol mpls/
            if (re.test(line)){

                protoMode = ProtoMode.mpls
                proto.type = "mpls"
                protoList.push(proto)
                // init new
                proto = new Protocol()
            }

            if(statType == StatType.logIFtraffic){
                re = /(I|i)nput +bytes/
                if(re.test(line))
                    counters.set("inBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                re = /(O|o)utput +bytes/
                if(re.test(line))
                    counters.set("outBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                re = /(I|i)nput +packets/
                if(re.test(line))
                    counters.set("inPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                re = /(O|o)utput +packets/
                if(re.test(line))
                    counters.set("outPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
            }

            re = /(L|l)ocal statistics/
            if(re.test(line)){
                // store the previously collected stats of type traffic
                statsList.push(new NetworkStats())
                statsList[statsCounter].type = "traffic"
                statsList[statsCounter].counters = counters
    
                // initialize for next stats type
                counters = new Map<string,number>()
                load = new Map<string,number>()
    
                statType = StatType.logIFlocal
                statsCounter++
            }

            if(statType == StatType.logIFlocal){
                re = /(I|i)nput +bytes/
                if(re.test(line))
                    counters.set("inBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                re = /(O|o)utput +bytes/
                if(re.test(line))
                    counters.set("outBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                re = /(I|i)nput +packets/
                if(re.test(line))
                    counters.set("inPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                re = /(O|o)utput +packets/
                if(re.test(line)){
                    counters.set("outPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))

                    // store the previously collected stats of type traffic
                    statsList.push(new NetworkStats())
                    statsList[statsCounter].type = "local"
                    statsList[statsCounter].counters = counters
        
                    // initialize for next stats type
                    counters = new Map<string,number>()
        
                    statType = StatType.logIFtransit
                    statsCounter++
                }
            }

            re = /(B|b)undle:/
            if(re.test(line)){
                statsList.push(new NetworkStats())
                statsList[statsCounter].type = "bundle"

                statType = StatType.logIFbundle
            }

            if(statType == StatType.logIFbundle){
                re = /(I|i)nput/
                if(re.test(line)){
                    counters.set("inPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                    counters.set("inBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[3]))
                    load.set("inPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[2]))
                    load.set("inBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[4])/8)
                }
                re = /(O|o)utput/
                if(re.test(line)){
                    counters.set("outPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[1]))
                    counters.set("outBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[3]))
                    load.set("outPkts", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[2]))
                    load.set("outBytes", Number(line.split(':')[1].replace(/  +/g, ' ').split(' ')[4])/8)

                    statsList.push(new NetworkStats())
                    statsList[statsCounter].type = "bundle"
                    statsList[statsCounter].counters = counters
                    statsList[statsCounter].load = load

                    statType = StatType.logIFtraffic
                }
            }
        }
    })

    // this here is a hack and should be fixed elsewhere, somewhere in the 
    // parsing procedure, one NetworkStats element too much gets added
    if(statsList.at(-1)?.type == undefined)
        statsList.pop()


    // handle the last logIF
    logIF.protocolList = protoList
    logIF.statsList = statsList
    logIFs.push(logIF)

    // the first is always empty
    logIFs.shift()

    nd.logIntList = logIFs

    return nd
}