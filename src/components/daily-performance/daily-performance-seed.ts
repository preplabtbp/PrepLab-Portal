import { DailyPerformanceRecord } from './daily-performance-types';

export const INITIAL_DAILY_PERFORMANCE_RECORDS: DailyPerformanceRecord[] = [
  {
    "id": "2026-10-01_A_DAY",
    "no": 1,
    "date": "01/10/2026",
    "isoDate": "2026-10-01",
    "week": 40,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 7,
        "bantn": 2,
        "lab": 9,
        "cuti": 4,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 410,
        "day": 1001,
        "wkly": 3053
      },
      "prod": {
        "shift": 43,
        "rc": 2,
        "day": 88,
        "wkly": 157
      },
      "exp": {
        "shift": 120,
        "day": 120,
        "wkly": 1008
      },
      "smelter": {
        "shift": 0,
        "day": 7,
        "wkly": 45
      }
    },
    "pressPowder": {
      "received": {
        "shift": 410,
        "day": 1001,
        "wkly": 3053
      },
      "finish": {
        "shift": 427,
        "day": 1189,
        "wkly": 3517
      }
    },
    "edxrf": {
      "epsC": 61,
      "epsD": 0,
      "epsE": 88,
      "epsF": 81,
      "epsG": 64,
      "epsH": 100,
      "s2Puma": 33,
      "shift": 427,
      "day": 1189,
      "wkly": 3517
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 167,
      "finishDay": 420,
      "finishWkly": 1086,
      "balExp": 120
    },
    "loi": {
      "os": 104,
      "w2": 52,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 260,
      "finLoiDay": 624,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 338,
      "zetiumA": {
        "prod": 43,
        "exp": 20,
        "smelt": 55,
        "gts": 0,
        "rarr": 19,
        "ver": 0,
        "std": 14,
        "blank": 4,
        "total": 155,
        "day": 327,
        "wkly": 1007
      },
      "zetiumB": {
        "prod": 0,
        "exp": 104,
        "smelt": 12,
        "gts": 0,
        "rarr": 2,
        "ver": 1,
        "std": 36,
        "blank": 4,
        "total": 159,
        "day": 324,
        "wkly": 790
      },
      "bal": 338
    },
    "qc": {
      "os": 286,
      "finishShift": 182,
      "finishDay": 416,
      "finishWkly": 1014,
      "bal": 234
    },
    "report": {
      "osReport": 22,
      "received": 352,
      "finishReportDay": 352,
      "finishReportWkly": 528,
      "bal": 22
    }
  },
  {
    "id": "2026-10-01_B_NIGHT",
    "no": 1,
    "date": "01/10/2026",
    "isoDate": "2026-10-01",
    "week": 40,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 10,
        "bantn": 0,
        "lab": 0,
        "cuti": 4,
        "alpa": 1,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 591,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 45,
        "rc": 2,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 7,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 591,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 762,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 146,
      "epsD": 0,
      "epsE": 140,
      "epsF": 140,
      "epsG": 129,
      "epsH": 140,
      "s2Puma": 67,
      "shift": 762,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 253,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 130,
      "w2": 130,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 338,
      "zetiumA": {
        "prod": 47,
        "exp": 58,
        "smelt": 2,
        "gts": 0,
        "rarr": 19,
        "ver": 19,
        "std": 25,
        "blank": 2,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 74,
        "smelt": 0,
        "gts": 0,
        "rarr": 23,
        "ver": 16,
        "std": 49,
        "blank": 3,
        "total": 165,
        "day": 0,
        "wkly": 0
      },
      "bal": 390
    },
    "qc": {
      "os": 234,
      "finishShift": 234,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-02_A_DAY",
    "no": 2,
    "date": "02/10/2026",
    "isoDate": "2026-10-02",
    "week": 40,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 8,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 494,
        "day": 972,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
        "rc": 1,
        "day": 32,
        "wkly": 0
      },
      "exp": {
        "shift": 120,
        "day": 120,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 12,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 494,
        "day": 972,
        "wkly": 0
      },
      "finish": {
        "shift": 445,
        "day": 1188,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 68,
      "epsD": 0,
      "epsE": 86,
      "epsF": 79,
      "epsG": 79,
      "epsH": 96,
      "s2Puma": 37,
      "shift": 445,
      "day": 1188,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 88,
      "finishDay": 283,
      "finishWkly": 0,
      "balExp": 120
    },
    "loi": {
      "os": 0,
      "w2": 0,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 130,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 390,
      "zetiumA": {
        "prod": 55,
        "exp": 32,
        "smelt": 13,
        "gts": 0,
        "rarr": 27,
        "ver": 0,
        "std": 35,
        "blank": 4,
        "total": 166,
        "day": 338,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 128,
        "smelt": 0,
        "gts": 0,
        "rarr": 9,
        "ver": 0,
        "std": 10,
        "blank": 5,
        "total": 152,
        "day": 221,
        "wkly": 0
      },
      "bal": 234
    },
    "qc": {
      "os": 104,
      "finishShift": 182,
      "finishDay": 338,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 22,
      "received": 286,
      "finishReportDay": 176,
      "finishReportWkly": 0,
      "bal": 132
    }
  },
  {
    "id": "2026-10-02_B_NIGHT",
    "no": 2,
    "date": "02/10/2026",
    "isoDate": "2026-10-02",
    "week": 40,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 0,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 478,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 17,
        "rc": 2,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 12,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 478,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 743,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 112,
      "epsD": 0,
      "epsE": 157,
      "epsF": 128,
      "epsG": 126,
      "epsH": 156,
      "s2Puma": 64,
      "shift": 743,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 195,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 130,
      "w2": 130,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 234,
      "zetiumA": {
        "prod": 15,
        "exp": 74,
        "smelt": 0,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 44,
        "blank": 2,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 59,
        "smelt": 0,
        "gts": 0,
        "rarr": 3,
        "ver": 0,
        "std": 5,
        "blank": 2,
        "total": 69,
        "day": 0,
        "wkly": 0
      },
      "bal": 234
    },
    "qc": {
      "os": 78,
      "finishShift": 156,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-03_A_DAY",
    "no": 3,
    "date": "03/10/2026",
    "isoDate": "2026-10-03",
    "week": 40,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 8,
        "bantn": 2,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 486,
        "day": 1080,
        "wkly": 0
      },
      "prod": {
        "shift": 14,
        "rc": 1,
        "day": 37,
        "wkly": 0
      },
      "exp": {
        "shift": 768,
        "day": 768,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 26,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 486,
        "day": 1080,
        "wkly": 0
      },
      "finish": {
        "shift": 490,
        "day": 1140,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 84,
      "epsD": 0,
      "epsE": 100,
      "epsF": 85,
      "epsG": 85,
      "epsH": 108,
      "s2Puma": 28,
      "shift": 490,
      "day": 1140,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 64,
      "finishDay": 383,
      "finishWkly": 0,
      "balExp": 720
    },
    "loi": {
      "os": 0,
      "w2": 78,
      "w4": 26,
      "w5": 0,
      "finLoiShift": 234,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 832
    },
    "wdxrf": {
      "osExp": 234,
      "zetiumA": {
        "prod": 34,
        "exp": 52,
        "smelt": 46,
        "gts": 0,
        "rarr": 13,
        "ver": 0,
        "std": 20,
        "blank": 5,
        "total": 170,
        "day": 342,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 1,
        "smelt": 22,
        "gts": 0,
        "rarr": 6,
        "ver": 16,
        "std": 27,
        "blank": 0,
        "total": 72,
        "day": 245,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 52,
      "finishShift": 52,
      "finishDay": 260,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 132,
      "received": 220,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 352
    }
  },
  {
    "id": "2026-10-03_B_NIGHT",
    "no": 3,
    "date": "03/10/2026",
    "isoDate": "2026-10-03",
    "week": 40,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 594,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 23,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 26,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 594,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 650,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 113,
      "epsD": 0,
      "epsE": 123,
      "epsF": 111,
      "epsG": 125,
      "epsH": 113,
      "s2Puma": 65,
      "shift": 650,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 720,
      "finishShift": 319,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 504
    },
    "loi": {
      "os": 832,
      "w2": 208,
      "w4": 208,
      "w5": 234,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 598
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 18,
        "exp": 53,
        "smelt": 8,
        "gts": 0,
        "rarr": 21,
        "ver": 19,
        "std": 50,
        "blank": 3,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 104,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 16,
        "std": 36,
        "blank": 5,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "bal": 260
    },
    "qc": {
      "os": 52,
      "finishShift": 208,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-04_A_LS",
    "no": 4,
    "date": "04/10/2026",
    "isoDate": "2026-10-04",
    "week": 41,
    "regu": "A",
    "shiftType": "LS",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 10,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 733,
        "day": 733,
        "wkly": 6903
      },
      "prod": {
        "shift": 27,
        "rc": 0,
        "day": 27,
        "wkly": 243
      },
      "exp": {
        "shift": 240,
        "day": 240,
        "wkly": 1800
      },
      "smelter": {
        "shift": 28,
        "day": 28,
        "wkly": 210
      }
    },
    "pressPowder": {
      "received": {
        "shift": 733,
        "day": 733,
        "wkly": 7037
      },
      "finish": {
        "shift": 874,
        "day": 874,
        "wkly": 8385
      }
    },
    "edxrf": {
      "epsC": 155,
      "epsD": 0,
      "epsE": 178,
      "epsF": 170,
      "epsG": 148,
      "epsH": 183,
      "s2Puma": 40,
      "shift": 874,
      "day": 874,
      "wkly": 8385
    },
    "fuseBead": {
      "osExp": 504,
      "finishShift": 303,
      "finishDay": 303,
      "finishWkly": 3300,
      "balExp": 552
    },
    "loi": {
      "os": 598,
      "w2": 130,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 234,
      "finLoiDay": 2028,
      "finLoiWkly": 0,
      "bal": 676
    },
    "wdxrf": {
      "osExp": 260,
      "zetiumA": {
        "prod": 27,
        "exp": 78,
        "smelt": 66,
        "gts": 29,
        "rarr": 16,
        "ver": 0,
        "std": 10,
        "blank": 10,
        "total": 236,
        "day": 236,
        "wkly": 2263
      },
      "zetiumB": {
        "prod": 0,
        "exp": 156,
        "smelt": 30,
        "gts": 0,
        "rarr": 20,
        "ver": 0,
        "std": 20,
        "blank": 7,
        "total": 233,
        "day": 233,
        "wkly": 2200
      },
      "bal": 234
    },
    "qc": {
      "os": 0,
      "finishShift": 156,
      "finishDay": 156,
      "finishWkly": 2028,
      "bal": 26
    },
    "report": {
      "osReport": 352,
      "received": 132,
      "finishReportDay": 352,
      "finishReportWkly": 1914,
      "bal": 132
    }
  },
  {
    "id": "2026-10-05_B_DAY",
    "no": 5,
    "date": "05/10/2026",
    "isoDate": "2026-10-05",
    "week": 41,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 10,
        "bantn": 0,
        "lab": 0,
        "cuti": 3,
        "alpa": 0,
        "izin": 3,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 648,
        "day": 1239,
        "wkly": 0
      },
      "prod": {
        "shift": 7,
        "rc": 0,
        "day": 32,
        "wkly": 0
      },
      "exp": {
        "shift": 120,
        "day": 120,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 35,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 648,
        "day": 1239,
        "wkly": 0
      },
      "finish": {
        "shift": 590,
        "day": 1462,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 70,
      "epsD": 0,
      "epsE": 130,
      "epsF": 115,
      "epsG": 85,
      "epsH": 121,
      "s2Puma": 69,
      "shift": 590,
      "day": 1462,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 552,
      "finishShift": 277,
      "finishDay": 472,
      "finishWkly": 0,
      "balExp": 552
    },
    "loi": {
      "os": 676,
      "w2": 234,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 338,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 676
    },
    "wdxrf": {
      "osExp": 234,
      "zetiumA": {
        "prod": 22,
        "exp": 0,
        "smelt": 45,
        "gts": 27,
        "rarr": 9,
        "ver": 19,
        "std": 51,
        "blank": 3,
        "total": 176,
        "day": 347,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 99,
        "smelt": 0,
        "gts": 0,
        "rarr": 14,
        "ver": 16,
        "std": 36,
        "blank": 3,
        "total": 168,
        "day": 317,
        "wkly": 0
      },
      "bal": 312
    },
    "qc": {
      "os": 26,
      "finishShift": 78,
      "finishDay": 156,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 132,
      "received": 132,
      "finishReportDay": 198,
      "finishReportWkly": 0,
      "bal": 66
    }
  },
  {
    "id": "2026-10-05_A_NIGHT",
    "no": 5,
    "date": "05/10/2026",
    "isoDate": "2026-10-05",
    "week": 41,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 7
      },
      "crew": {
        "shift": 10,
        "bantn": 2,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 591,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 25,
        "rc": 1,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 35,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 591,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 872,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 140,
      "epsD": 0,
      "epsE": 170,
      "epsF": 162,
      "epsG": 155,
      "epsH": 165,
      "s2Puma": 80,
      "shift": 872,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 552,
      "finishShift": 195,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 432
    },
    "loi": {
      "os": 676,
      "w2": 208,
      "w4": 208,
      "w5": 208,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 468
    },
    "wdxrf": {
      "osExp": 312,
      "zetiumA": {
        "prod": 19,
        "exp": 5,
        "smelt": 49,
        "gts": 0,
        "rarr": 34,
        "ver": 19,
        "std": 41,
        "blank": 4,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 35,
        "smelt": 42,
        "gts": 0,
        "rarr": 19,
        "ver": 16,
        "std": 34,
        "blank": 3,
        "total": 149,
        "day": 0,
        "wkly": 0
      },
      "bal": 364
    },
    "qc": {
      "os": 52,
      "finishShift": 78,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-06_B_DAY",
    "no": 6,
    "date": "06/10/2026",
    "isoDate": "2026-10-06",
    "week": 41,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 1,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 428,
        "day": 1120,
        "wkly": 0
      },
      "prod": {
        "shift": 20,
        "rc": 2,
        "day": 32,
        "wkly": 0
      },
      "exp": {
        "shift": 144,
        "day": 144,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 21,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 428,
        "day": 1120,
        "wkly": 0
      },
      "finish": {
        "shift": 534,
        "day": 1324,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 88,
      "epsD": 0,
      "epsE": 100,
      "epsF": 100,
      "epsG": 88,
      "epsH": 107,
      "s2Puma": 51,
      "shift": 534,
      "day": 1324,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 432,
      "finishShift": 347,
      "finishDay": 557,
      "finishWkly": 0,
      "balExp": 336
    },
    "loi": {
      "os": 468,
      "w2": 260,
      "w4": 260,
      "w5": 260,
      "finLoiShift": 468,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 364
    },
    "wdxrf": {
      "osExp": 364,
      "zetiumA": {
        "prod": 27,
        "exp": 39,
        "smelt": 64,
        "gts": 0,
        "rarr": 22,
        "ver": 2,
        "std": 8,
        "blank": 7,
        "total": 169,
        "day": 336,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 140,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 0,
        "std": 14,
        "blank": 5,
        "total": 160,
        "day": 315,
        "wkly": 0
      },
      "bal": 442
    },
    "qc": {
      "os": 0,
      "finishShift": 130,
      "finishDay": 312,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 66,
      "received": 264,
      "finishReportDay": 110,
      "finishReportWkly": 0,
      "bal": 220
    }
  },
  {
    "id": "2026-10-06_A_NIGHT",
    "no": 6,
    "date": "06/10/2026",
    "isoDate": "2026-10-06",
    "week": 41,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 7
      },
      "crew": {
        "shift": 10,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 692,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 12,
        "rc": 1,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 21,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 692,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 790,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 133,
      "epsD": 0,
      "epsE": 148,
      "epsF": 149,
      "epsG": 152,
      "epsH": 152,
      "s2Puma": 56,
      "shift": 790,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 336,
      "finishShift": 210,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 192
    },
    "loi": {
      "os": 364,
      "w2": 312,
      "w4": 208,
      "w5": 208,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 442,
      "zetiumA": {
        "prod": 27,
        "exp": 71,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 19,
        "std": 36,
        "blank": 2,
        "total": 167,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 91,
        "smelt": 0,
        "gts": 0,
        "rarr": 13,
        "ver": 16,
        "std": 32,
        "blank": 3,
        "total": 155,
        "day": 0,
        "wkly": 0
      },
      "bal": 390
    },
    "qc": {
      "os": 52,
      "finishShift": 182,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-07_B_DAY",
    "no": 7,
    "date": "07/10/2026",
    "isoDate": "2026-10-07",
    "week": 41,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 1,
        "izin": 0,
        "sakit": 1,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 571,
        "day": 970,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 0,
        "day": 39,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 192,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 44,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 571,
        "day": 970,
        "wkly": 0
      },
      "finish": {
        "shift": 531,
        "day": 1194,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 86,
      "epsD": 0,
      "epsE": 107,
      "epsF": 93,
      "epsG": 95,
      "epsH": 116,
      "s2Puma": 34,
      "shift": 531,
      "day": 1194,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 192,
      "finishShift": 274,
      "finishDay": 502,
      "finishWkly": 0,
      "balExp": 168
    },
    "loi": {
      "os": 130,
      "w2": 52,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 208,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 208
    },
    "wdxrf": {
      "osExp": 390,
      "zetiumA": {
        "prod": 14,
        "exp": 72,
        "smelt": 39,
        "gts": 0,
        "rarr": 30,
        "ver": 0,
        "std": 13,
        "blank": 5,
        "total": 173,
        "day": 344,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 137,
        "smelt": 0,
        "gts": 0,
        "rarr": 2,
        "ver": 2,
        "std": 19,
        "blank": 6,
        "total": 166,
        "day": 337,
        "wkly": 0
      },
      "bal": 390
    },
    "qc": {
      "os": 52,
      "finishShift": 156,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 220,
      "received": 242,
      "finishReportDay": 286,
      "finishReportWkly": 0,
      "bal": 176
    }
  },
  {
    "id": "2026-10-07_A_NIGHT",
    "no": 7,
    "date": "07/10/2026",
    "isoDate": "2026-10-07",
    "week": 41,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 7
      },
      "crew": {
        "shift": 10,
        "bantn": 0,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 399,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 20,
        "rc": 2,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 44,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 399,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 663,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 105,
      "epsD": 0,
      "epsE": 122,
      "epsF": 120,
      "epsG": 120,
      "epsH": 147,
      "s2Puma": 49,
      "shift": 663,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 168,
      "finishShift": 228,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 96
    },
    "loi": {
      "os": 208,
      "w2": 130,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 390,
      "zetiumA": {
        "prod": 22,
        "exp": 63,
        "smelt": 4,
        "gts": 0,
        "rarr": 15,
        "ver": 19,
        "std": 44,
        "blank": 4,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 106,
        "smelt": 0,
        "gts": 0,
        "rarr": 9,
        "ver": 16,
        "std": 36,
        "blank": 4,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "bal": 338
    },
    "qc": {
      "os": 104,
      "finishShift": 130,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 130
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-08_B_DAY",
    "no": 8,
    "date": "08/10/2026",
    "isoDate": "2026-10-08",
    "week": 41,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 11
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 1,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 461,
        "day": 955,
        "wkly": 0
      },
      "prod": {
        "shift": 26,
        "rc": 0,
        "day": 49,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 216,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 21,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 461,
        "day": 955,
        "wkly": 0
      },
      "finish": {
        "shift": 516,
        "day": 1200,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 102,
      "epsD": 0,
      "epsE": 103,
      "epsF": 85,
      "epsG": 82,
      "epsH": 100,
      "s2Puma": 44,
      "shift": 516,
      "day": 1200,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 96,
      "finishShift": 286,
      "finishDay": 496,
      "finishWkly": 0,
      "balExp": 192
    },
    "loi": {
      "os": 130,
      "w2": 52,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 286,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 208
    },
    "wdxrf": {
      "osExp": 338,
      "zetiumA": {
        "prod": 24,
        "exp": 54,
        "smelt": 65,
        "gts": 0,
        "rarr": 14,
        "ver": 0,
        "std": 6,
        "blank": 4,
        "total": 167,
        "day": 333,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 134,
        "smelt": 0,
        "gts": 0,
        "rarr": 13,
        "ver": 0,
        "std": 12,
        "blank": 6,
        "total": 165,
        "day": 331,
        "wkly": 0
      },
      "bal": 364
    },
    "qc": {
      "os": 130,
      "finishShift": 260,
      "finishDay": 468,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 176,
      "received": 396,
      "finishReportDay": 330,
      "finishReportWkly": 0,
      "bal": 242
    }
  },
  {
    "id": "2026-10-08_A_NIGHT",
    "no": 8,
    "date": "08/10/2026",
    "isoDate": "2026-10-08",
    "week": 41,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 7
      },
      "crew": {
        "shift": 10,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 494,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 23,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 24,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 21,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 494,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 684,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 95,
      "epsD": 0,
      "epsE": 139,
      "epsF": 128,
      "epsG": 124,
      "epsH": 147,
      "s2Puma": 51,
      "shift": 684,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 192,
      "finishShift": 210,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 96
    },
    "loi": {
      "os": 208,
      "w2": 208,
      "w4": 156,
      "w5": 156,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 78
    },
    "wdxrf": {
      "osExp": 364,
      "zetiumA": {
        "prod": 30,
        "exp": 50,
        "smelt": 8,
        "gts": 0,
        "rarr": 15,
        "ver": 19,
        "std": 40,
        "blank": 4,
        "total": 166,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 98,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 16,
        "std": 37,
        "blank": 3,
        "total": 166,
        "day": 0,
        "wkly": 0
      },
      "bal": 312
    },
    "qc": {
      "os": 52,
      "finishShift": 208,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-09_B_DAY",
    "no": 9,
    "date": "09/10/2026",
    "isoDate": "2026-10-09",
    "week": 41,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 11
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 347,
        "day": 944,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
        "rc": 0,
        "day": 30,
        "wkly": 0
      },
      "exp": {
        "shift": 144,
        "day": 168,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 30,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 347,
        "day": 944,
        "wkly": 0
      },
      "finish": {
        "shift": 382,
        "day": 1036,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 63,
      "epsD": 0,
      "epsE": 75,
      "epsF": 81,
      "epsG": 72,
      "epsH": 63,
      "s2Puma": 28,
      "shift": 382,
      "day": 1036,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 96,
      "finishShift": 214,
      "finishDay": 494,
      "finishWkly": 0,
      "balExp": 144
    },
    "loi": {
      "os": 78,
      "w2": 26,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 182,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 156
    },
    "wdxrf": {
      "osExp": 312,
      "zetiumA": {
        "prod": 24,
        "exp": 93,
        "smelt": 30,
        "gts": 0,
        "rarr": 12,
        "ver": 0,
        "std": 8,
        "blank": 4,
        "total": 171,
        "day": 342,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 149,
        "smelt": 0,
        "gts": 0,
        "rarr": 3,
        "ver": 2,
        "std": 14,
        "blank": 5,
        "total": 173,
        "day": 337,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 0,
      "finishShift": 182,
      "finishDay": 364,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 242,
      "received": 308,
      "finishReportDay": 330,
      "finishReportWkly": 0,
      "bal": 220
    }
  },
  {
    "id": "2026-10-09_A_NIGHT",
    "no": 9,
    "date": "09/10/2026",
    "isoDate": "2026-10-09",
    "week": 41,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 7
      },
      "crew": {
        "shift": 11,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 597,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 24,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 30,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 597,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 654,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 121,
      "epsD": 0,
      "epsE": 130,
      "epsF": 121,
      "epsG": 110,
      "epsH": 109,
      "s2Puma": 63,
      "shift": 654,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 144,
      "finishShift": 280,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 24
    },
    "loi": {
      "os": 156,
      "w2": 182,
      "w4": 130,
      "w5": 104,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 78
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 19,
        "exp": 37,
        "smelt": 0,
        "gts": 0,
        "rarr": 35,
        "ver": 19,
        "std": 59,
        "blank": 2,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 85,
        "smelt": 0,
        "gts": 0,
        "rarr": 30,
        "ver": 16,
        "std": 29,
        "blank": 4,
        "total": 164,
        "day": 0,
        "wkly": 0
      },
      "bal": 260
    },
    "qc": {
      "os": 78,
      "finishShift": 182,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-10_B_DAY",
    "no": 10,
    "date": "10/10/2026",
    "isoDate": "2026-10-10",
    "week": 41,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 11
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 410,
        "day": 942,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 1,
        "day": 34,
        "wkly": 0
      },
      "exp": {
        "shift": 720,
        "day": 720,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 31,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 544,
        "day": 1076,
        "wkly": 0
      },
      "finish": {
        "shift": 459,
        "day": 1295,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 79,
      "epsD": 0,
      "epsE": 93,
      "epsF": 78,
      "epsG": 78,
      "epsH": 91,
      "s2Puma": 40,
      "shift": 459,
      "day": 1295,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 24,
      "finishShift": 166,
      "finishDay": 476,
      "finishWkly": 0,
      "balExp": 576
    },
    "loi": {
      "os": 78,
      "w2": 130,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 312,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 702
    },
    "wdxrf": {
      "osExp": 260,
      "zetiumA": {
        "prod": 24,
        "exp": 52,
        "smelt": 60,
        "gts": 0,
        "rarr": 14,
        "ver": 0,
        "std": 12,
        "blank": 6,
        "total": 168,
        "day": 325,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 132,
        "smelt": 0,
        "gts": 0,
        "rarr": 13,
        "ver": 0,
        "std": 19,
        "blank": 5,
        "total": 169,
        "day": 330,
        "wkly": 0
      },
      "bal": 130
    },
    "qc": {
      "os": 0,
      "finishShift": 182,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 220,
      "received": 242,
      "finishReportDay": 308,
      "finishReportWkly": 0,
      "bal": 154
    }
  },
  {
    "id": "2026-10-10_A_NIGHT",
    "no": 10,
    "date": "10/10/2026",
    "isoDate": "2026-10-10",
    "week": 41,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 7
      },
      "crew": {
        "shift": 11,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 532,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 31,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 532,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 836,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 127,
      "epsD": 0,
      "epsE": 136,
      "epsF": 127,
      "epsG": 162,
      "epsH": 230,
      "s2Puma": 54,
      "shift": 836,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 576,
      "finishShift": 310,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 408
    },
    "loi": {
      "os": 702,
      "w2": 208,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 468
    },
    "wdxrf": {
      "osExp": 130,
      "zetiumA": {
        "prod": 26,
        "exp": 0,
        "smelt": 0,
        "gts": 91,
        "rarr": 11,
        "ver": 19,
        "std": 8,
        "blank": 2,
        "total": 157,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 102,
        "smelt": 0,
        "gts": 0,
        "rarr": 10,
        "ver": 9,
        "std": 37,
        "blank": 3,
        "total": 161,
        "day": 0,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 0,
      "finishShift": 104,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-11_B_LS",
    "no": 11,
    "date": "11/10/2026",
    "isoDate": "2026-10-11",
    "week": 42,
    "regu": "B",
    "shiftType": "LS",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 723,
        "day": 723,
        "wkly": 6750
      },
      "prod": {
        "shift": 23,
        "rc": 1,
        "day": 23,
        "wkly": 255
      },
      "exp": {
        "shift": 144,
        "day": 144,
        "wkly": 2099
      },
      "smelter": {
        "shift": 33,
        "day": 33,
        "wkly": 181
      }
    },
    "pressPowder": {
      "received": {
        "shift": 771,
        "day": 771,
        "wkly": 6798
      },
      "finish": {
        "shift": 912,
        "day": 912,
        "wkly": 8079
      }
    },
    "edxrf": {
      "epsC": 141,
      "epsD": 0,
      "epsE": 190,
      "epsF": 164,
      "epsG": 197,
      "epsH": 188,
      "s2Puma": 32,
      "shift": 912,
      "day": 912,
      "wkly": 8079
    },
    "fuseBead": {
      "osExp": 408,
      "finishShift": 472,
      "finishDay": 472,
      "finishWkly": 3201,
      "balExp": 216
    },
    "loi": {
      "os": 468,
      "w2": 286,
      "w4": 390,
      "w5": 390,
      "finLoiShift": 390,
      "finLoiDay": 2180,
      "finLoiWkly": 0,
      "bal": 338
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 34,
        "exp": 83,
        "smelt": 55,
        "gts": 0,
        "rarr": 19,
        "ver": 2,
        "std": 43,
        "blank": 8,
        "total": 244,
        "day": 244,
        "wkly": 2236
      },
      "zetiumB": {
        "prod": 0,
        "exp": 128,
        "smelt": 0,
        "gts": 0,
        "rarr": 7,
        "ver": 28,
        "std": 14,
        "blank": 5,
        "total": 182,
        "day": 182,
        "wkly": 1719
      },
      "bal": 312
    },
    "qc": {
      "os": 52,
      "finishShift": 182,
      "finishDay": 182,
      "finishWkly": 1859,
      "bal": 156
    },
    "report": {
      "osReport": 154,
      "received": 154,
      "finishReportDay": 0,
      "finishReportWkly": 1539,
      "bal": 308
    }
  },
  {
    "id": "2026-10-12_A_DAY",
    "no": 12,
    "date": "12/10/2026",
    "isoDate": "2026-10-12",
    "week": 42,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 9,
        "bantn": 0,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 551,
        "day": 1200,
        "wkly": 0
      },
      "prod": {
        "shift": 21,
        "rc": 0,
        "day": 45,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 35,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 551,
        "day": 1200,
        "wkly": 0
      },
      "finish": {
        "shift": 524,
        "day": 1376,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 64,
      "epsD": 0,
      "epsE": 115,
      "epsF": 111,
      "epsG": 90,
      "epsH": 110,
      "s2Puma": 34,
      "shift": 524,
      "day": 1376,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 216,
      "finishShift": 135,
      "finishDay": 401,
      "finishWkly": 0,
      "balExp": 192
    },
    "loi": {
      "os": 338,
      "w2": 130,
      "w4": 52,
      "w5": 52,
      "finLoiShift": 234,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 312
    },
    "wdxrf": {
      "osExp": 312,
      "zetiumA": {
        "prod": 0,
        "exp": 0,
        "smelt": 28,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 39,
        "blank": 1,
        "total": 105,
        "day": 275,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 0,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 16,
        "std": 3,
        "blank": 0,
        "total": 19,
        "day": 19,
        "wkly": 0
      },
      "bal": 286
    },
    "qc": {
      "os": 156,
      "finishShift": 104,
      "finishDay": 130,
      "finishWkly": 0,
      "bal": 130
    },
    "report": {
      "osReport": 308,
      "received": 110,
      "finishReportDay": 198,
      "finishReportWkly": 0,
      "bal": 220
    }
  },
  {
    "id": "2026-10-12_B_NIGHT",
    "no": 12,
    "date": "12/10/2026",
    "isoDate": "2026-10-12",
    "week": 42,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 649,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 24,
        "rc": 3,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 35,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 649,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 852,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 162,
      "epsD": 0,
      "epsE": 156,
      "epsF": 160,
      "epsG": 157,
      "epsH": 160,
      "s2Puma": 57,
      "shift": 852,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 192,
      "finishShift": 266,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 72
    },
    "loi": {
      "os": 312,
      "w2": 208,
      "w4": 182,
      "w5": 182,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 104
    },
    "wdxrf": {
      "osExp": 286,
      "zetiumA": {
        "prod": 31,
        "exp": 26,
        "smelt": 29,
        "gts": 0,
        "rarr": 24,
        "ver": 19,
        "std": 36,
        "blank": 5,
        "total": 170,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 0,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 0,
        "std": 0,
        "blank": 0,
        "total": 0,
        "day": 0,
        "wkly": 0
      },
      "bal": 416
    },
    "qc": {
      "os": 130,
      "finishShift": 26,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-13_A_DAY",
    "no": 13,
    "date": "13/10/2026",
    "isoDate": "2026-10-13",
    "week": 42,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 1,
        "lab": 0,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 514,
        "day": 1089,
        "wkly": 0
      },
      "prod": {
        "shift": 21,
        "rc": 0,
        "day": 47,
        "wkly": 0
      },
      "exp": {
        "shift": 168,
        "day": 306,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 15,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 514,
        "day": 1089,
        "wkly": 0
      },
      "finish": {
        "shift": 547,
        "day": 1275,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 95,
      "epsD": 0,
      "epsE": 97,
      "epsF": 95,
      "epsG": 93,
      "epsH": 117,
      "s2Puma": 50,
      "shift": 547,
      "day": 1275,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 72,
      "finishShift": 164,
      "finishDay": 431,
      "finishWkly": 0,
      "balExp": 96
    },
    "loi": {
      "os": 104,
      "w2": 156,
      "w4": 104,
      "w5": 104,
      "finLoiShift": 286,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 182
    },
    "wdxrf": {
      "osExp": 416,
      "zetiumA": {
        "prod": 26,
        "exp": 25,
        "smelt": 70,
        "gts": 0,
        "rarr": 43,
        "ver": 0,
        "std": 7,
        "blank": 3,
        "total": 174,
        "day": 347,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 0,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 19,
        "std": 8,
        "blank": 0,
        "total": 27,
        "day": 200,
        "wkly": 0
      },
      "bal": 520
    },
    "qc": {
      "os": 104,
      "finishShift": 104,
      "finishDay": 234,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 220,
      "received": 198,
      "finishReportDay": 308,
      "finishReportWkly": 0,
      "bal": 110
    }
  },
  {
    "id": "2026-10-13_B_NIGHT",
    "no": 13,
    "date": "13/10/2026",
    "isoDate": "2026-10-13",
    "week": 42,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 575,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 26,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 138,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 15,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 575,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 728,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 123,
      "epsD": 0,
      "epsE": 139,
      "epsF": 139,
      "epsG": 157,
      "epsH": 151,
      "s2Puma": 19,
      "shift": 728,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 96,
      "finishShift": 267,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 138
    },
    "loi": {
      "os": 182,
      "w2": 130,
      "w4": 182,
      "w5": 182,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 150
    },
    "wdxrf": {
      "osExp": 520,
      "zetiumA": {
        "prod": 23,
        "exp": 56,
        "smelt": 10,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 44,
        "blank": 3,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 78,
        "smelt": 0,
        "gts": 0,
        "rarr": 25,
        "ver": 16,
        "std": 51,
        "blank": 3,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "bal": 572
    },
    "qc": {
      "os": 0,
      "finishShift": 130,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-14_A_DAY",
    "no": 14,
    "date": "14/10/2026",
    "isoDate": "2026-10-14",
    "week": 42,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 9,
        "bantn": 2,
        "lab": 0,
        "cuti": 5,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 17
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 445,
        "day": 960,
        "wkly": 0
      },
      "prod": {
        "shift": 18,
        "rc": 0,
        "day": 35,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 382,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 26,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 445,
        "day": 960,
        "wkly": 0
      },
      "finish": {
        "shift": 480,
        "day": 1127,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 65,
      "epsD": 0,
      "epsE": 110,
      "epsF": 82,
      "epsG": 94,
      "epsH": 109,
      "s2Puma": 20,
      "shift": 480,
      "day": 1127,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 138,
      "finishShift": 101,
      "finishDay": 375,
      "finishWkly": 0,
      "balExp": 238
    },
    "loi": {
      "os": 150,
      "w2": 150,
      "w4": 100,
      "w5": 100,
      "finLoiShift": 304,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 258
    },
    "wdxrf": {
      "osExp": 572,
      "zetiumA": {
        "prod": 28,
        "exp": 91,
        "smelt": 21,
        "gts": 0,
        "rarr": 14,
        "ver": 0,
        "std": 16,
        "blank": 6,
        "total": 176,
        "day": 349,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 112,
        "smelt": 0,
        "gts": 0,
        "rarr": 25,
        "ver": 0,
        "std": 15,
        "blank": 4,
        "total": 156,
        "day": 328,
        "wkly": 0
      },
      "bal": 440
    },
    "qc": {
      "os": 0,
      "finishShift": 78,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 110,
      "received": 242,
      "finishReportDay": 176,
      "finishReportWkly": 0,
      "bal": 176
    }
  },
  {
    "id": "2026-10-14_B_NIGHT",
    "no": 14,
    "date": "14/10/2026",
    "isoDate": "2026-10-14",
    "week": 42,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 515,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 17,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 190,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 26,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 515,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 647,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 109,
      "epsD": 0,
      "epsE": 116,
      "epsF": 112,
      "epsG": 116,
      "epsH": 118,
      "s2Puma": 76,
      "shift": 647,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 238,
      "finishShift": 274,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 329
    },
    "loi": {
      "os": 258,
      "w2": 189,
      "w4": 211,
      "w5": 204,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 305
    },
    "wdxrf": {
      "osExp": 440,
      "zetiumA": {
        "prod": 22,
        "exp": 65,
        "smelt": 1,
        "gts": 0,
        "rarr": 27,
        "ver": 19,
        "std": 37,
        "blank": 2,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 97,
        "smelt": 0,
        "gts": 0,
        "rarr": 46,
        "ver": 0,
        "std": 24,
        "blank": 5,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "bal": 384
    },
    "qc": {
      "os": 104,
      "finishShift": 208,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-15_A_DAY",
    "no": 15,
    "date": "15/10/2026",
    "isoDate": "2026-10-15",
    "week": 42,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 10,
        "bantn": 2,
        "lab": 0,
        "cuti": 5,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 17
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 501,
        "day": 1138,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 2,
        "day": 44,
        "wkly": 0
      },
      "exp": {
        "shift": 188,
        "day": 211,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 20,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 501,
        "day": 1138,
        "wkly": 0
      },
      "finish": {
        "shift": 488,
        "day": 1247,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 95,
      "epsD": 0,
      "epsE": 107,
      "epsF": 84,
      "epsG": 88,
      "epsH": 92,
      "s2Puma": 22,
      "shift": 488,
      "day": 1247,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 305,
      "finishShift": 199,
      "finishDay": 522,
      "finishWkly": 0,
      "balExp": 327
    },
    "loi": {
      "os": 305,
      "w2": 127,
      "w4": 205,
      "w5": 237,
      "finLoiShift": 425,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 329
    },
    "wdxrf": {
      "osExp": 384,
      "zetiumA": {
        "prod": 19,
        "exp": 52,
        "smelt": 47,
        "gts": 0,
        "rarr": 20,
        "ver": 0,
        "std": 23,
        "blank": 5,
        "total": 166,
        "day": 339,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 58,
        "smelt": 0,
        "gts": 0,
        "rarr": 17,
        "ver": 16,
        "std": 41,
        "blank": 3,
        "total": 135,
        "day": 307,
        "wkly": 0
      },
      "bal": 383
    },
    "qc": {
      "os": 78,
      "finishShift": 104,
      "finishDay": 362,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 176,
      "received": 218,
      "finishReportDay": 180,
      "finishReportWkly": 0,
      "bal": 214
    }
  },
  {
    "id": "2026-10-15_B_NIGHT",
    "no": 15,
    "date": "15/10/2026",
    "isoDate": "2026-10-15",
    "week": 42,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 1,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 637,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 25,
        "rc": 2,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 23,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 20,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 637,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 759,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 143,
      "epsD": 0,
      "epsE": 134,
      "epsF": 139,
      "epsG": 140,
      "epsH": 148,
      "s2Puma": 55,
      "shift": 759,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 327,
      "finishShift": 323,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 230
    },
    "loi": {
      "os": 329,
      "w2": 188,
      "w4": 163,
      "w5": 188,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 175
    },
    "wdxrf": {
      "osExp": 383,
      "zetiumA": {
        "prod": 21,
        "exp": 71,
        "smelt": 0,
        "gts": 0,
        "rarr": 42,
        "ver": 19,
        "std": 17,
        "blank": 3,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 98,
        "smelt": 0,
        "gts": 0,
        "rarr": 4,
        "ver": 16,
        "std": 50,
        "blank": 4,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "bal": 384
    },
    "qc": {
      "os": 104,
      "finishShift": 258,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-16_A_DAY",
    "no": 16,
    "date": "16/10/2026",
    "isoDate": "2026-10-16",
    "week": 42,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 12,
        "bantn": 1,
        "lab": 0,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 336,
        "day": 841,
        "wkly": 0
      },
      "prod": {
        "shift": 14,
        "rc": 0,
        "day": 30,
        "wkly": 0
      },
      "exp": {
        "shift": 144,
        "day": 168,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 35,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 336,
        "day": 841,
        "wkly": 0
      },
      "finish": {
        "shift": 338,
        "day": 1044,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 50,
      "epsD": 0,
      "epsE": 55,
      "epsF": 67,
      "epsG": 66,
      "epsH": 74,
      "s2Puma": 26,
      "shift": 338,
      "day": 1044,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 230,
      "finishShift": 290,
      "finishDay": 506,
      "finishWkly": 0,
      "balExp": 213
    },
    "loi": {
      "os": 175,
      "w2": 152,
      "w4": 175,
      "w5": 175,
      "finLoiShift": 331,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 156
    },
    "wdxrf": {
      "osExp": 384,
      "zetiumA": {
        "prod": 29,
        "exp": 41,
        "smelt": 40,
        "gts": 0,
        "rarr": 25,
        "ver": 0,
        "std": 33,
        "blank": 5,
        "total": 173,
        "day": 346,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 124,
        "smelt": 0,
        "gts": 0,
        "rarr": 18,
        "ver": 0,
        "std": 25,
        "blank": 4,
        "total": 171,
        "day": 343,
        "wkly": 0
      },
      "bal": 431
    },
    "qc": {
      "os": 78,
      "finishShift": 78,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 103
    },
    "report": {
      "osReport": 214,
      "received": 286,
      "finishReportDay": 324,
      "finishReportWkly": 0,
      "bal": 176
    }
  },
  {
    "id": "2026-10-16_B_NIGHT",
    "no": 16,
    "date": "16/10/2026",
    "isoDate": "2026-10-16",
    "week": 42,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 14,
        "bantn": 0,
        "lab": 0,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 505,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 16,
        "rc": 2,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 24,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 35,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 505,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 706,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 128,
      "epsD": 0,
      "epsE": 170,
      "epsF": 118,
      "epsG": 131,
      "epsH": 129,
      "s2Puma": 30,
      "shift": 706,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 213,
      "finishShift": 216,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 120
    },
    "loi": {
      "os": 156,
      "w2": 104,
      "w4": 156,
      "w5": 156,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 26
    },
    "wdxrf": {
      "osExp": 431,
      "zetiumA": {
        "prod": 19,
        "exp": 63,
        "smelt": 0,
        "gts": 0,
        "rarr": 31,
        "ver": 19,
        "std": 39,
        "blank": 2,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 106,
        "smelt": 0,
        "gts": 0,
        "rarr": 17,
        "ver": 18,
        "std": 29,
        "blank": 2,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "bal": 351
    },
    "qc": {
      "os": 103,
      "finishShift": 208,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 75
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-17_A_DAY",
    "no": 17,
    "date": "17/10/2026",
    "isoDate": "2026-10-17",
    "week": 42,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 2,
        "lab": 0,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 17
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 440,
        "day": 799,
        "wkly": 0
      },
      "prod": {
        "shift": 20,
        "rc": 1,
        "day": 31,
        "wkly": 0
      },
      "exp": {
        "shift": 744,
        "day": 888,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 17,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 440,
        "day": 799,
        "wkly": 0
      },
      "finish": {
        "shift": 461,
        "day": 1098,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 73,
      "epsD": 0,
      "epsE": 104,
      "epsF": 94,
      "epsG": 87,
      "epsH": 89,
      "s2Puma": 14,
      "shift": 461,
      "day": 1098,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 264,
      "finishDay": 494,
      "finishWkly": 0,
      "balExp": 696
    },
    "loi": {
      "os": 26,
      "w2": 100,
      "w4": 26,
      "w5": 26,
      "finLoiShift": 210,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 806
    },
    "wdxrf": {
      "osExp": 351,
      "zetiumA": {
        "prod": 18,
        "exp": 54,
        "smelt": 54,
        "gts": 12,
        "rarr": 15,
        "ver": 0,
        "std": 13,
        "blank": 5,
        "total": 171,
        "day": 336,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 116,
        "smelt": 0,
        "gts": 0,
        "rarr": 9,
        "ver": 2,
        "std": 41,
        "blank": 2,
        "total": 170,
        "day": 340,
        "wkly": 0
      },
      "bal": 356
    },
    "qc": {
      "os": 75,
      "finishShift": 177,
      "finishDay": 379,
      "finishWkly": 0,
      "bal": 75
    },
    "report": {
      "osReport": 176,
      "received": 379,
      "finishReportDay": 353,
      "finishReportWkly": 0,
      "bal": 202
    }
  },
  {
    "id": "2026-10-17_B_NIGHT",
    "no": 17,
    "date": "17/10/2026",
    "isoDate": "2026-10-17",
    "week": 42,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 7,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 15,
        "bantn": 0,
        "lab": 0,
        "cuti": 0,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 359,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 11,
        "rc": 1,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 144,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 17,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 359,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 637,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 109,
      "epsD": 0,
      "epsE": 97,
      "epsF": 113,
      "epsG": 92,
      "epsH": 117,
      "s2Puma": 109,
      "shift": 637,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 696,
      "finishShift": 230,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 744
    },
    "loi": {
      "os": 806,
      "w2": 182,
      "w4": 184,
      "w5": 184,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 832
    },
    "wdxrf": {
      "osExp": 356,
      "zetiumA": {
        "prod": 22,
        "exp": 49,
        "smelt": 11,
        "gts": 0,
        "rarr": 19,
        "ver": 19,
        "std": 42,
        "blank": 3,
        "total": 165,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 108,
        "smelt": 0,
        "gts": 0,
        "rarr": 14,
        "ver": 16,
        "std": 30,
        "blank": 2,
        "total": 170,
        "day": 0,
        "wkly": 0
      },
      "bal": 308
    },
    "qc": {
      "os": 75,
      "finishShift": 202,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 25
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-18_A_LS",
    "no": 18,
    "date": "18/10/2026",
    "isoDate": "2026-10-18",
    "week": 43,
    "regu": "A",
    "shiftType": "LS",
    "manpower": {
      "staff": {
        "shift": 5,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 2,
        "lab": 0,
        "cuti": 3,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 18
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 850,
        "day": 850,
        "wkly": 2124
      },
      "prod": {
        "shift": 28,
        "rc": 2,
        "day": 28,
        "wkly": 65
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 336
      },
      "smelter": {
        "shift": 15,
        "day": 15,
        "wkly": 47
      }
    },
    "pressPowder": {
      "received": {
        "shift": 850,
        "day": 850,
        "wkly": 2124
      },
      "finish": {
        "shift": 949,
        "day": 949,
        "wkly": 2433
      }
    },
    "edxrf": {
      "epsC": 180,
      "epsD": 0,
      "epsE": 168,
      "epsF": 181,
      "epsG": 194,
      "epsH": 160,
      "s2Puma": 66,
      "shift": 949,
      "day": 949,
      "wkly": 2433
    },
    "fuseBead": {
      "osExp": 744,
      "finishShift": 365,
      "finishDay": 365,
      "finishWkly": 727,
      "balExp": 480
    },
    "loi": {
      "os": 832,
      "w2": 182,
      "w4": 286,
      "w5": 286,
      "finLoiShift": 286,
      "finLoiDay": 468,
      "finLoiWkly": 0,
      "bal": 546
    },
    "wdxrf": {
      "osExp": 308,
      "zetiumA": {
        "prod": 40,
        "exp": 78,
        "smelt": 24,
        "gts": 58,
        "rarr": 16,
        "ver": 0,
        "std": 16,
        "blank": 6,
        "total": 238,
        "day": 238,
        "wkly": 301
      },
      "zetiumB": {
        "prod": 0,
        "exp": 180,
        "smelt": 0,
        "gts": 0,
        "rarr": 3,
        "ver": 0,
        "std": 36,
        "blank": 3,
        "total": 222,
        "day": 222,
        "wkly": 629
      },
      "bal": 312
    },
    "qc": {
      "os": 25,
      "finishShift": 100,
      "finishDay": 100,
      "finishWkly": 256,
      "bal": 180
    },
    "report": {
      "osReport": 202,
      "received": 100,
      "finishReportDay": 302,
      "finishReportWkly": 434,
      "bal": 0
    }
  },
  {
    "id": "2026-10-19_B_DAY",
    "no": 19,
    "date": "19/10/2026",
    "isoDate": "2026-10-19",
    "week": 43,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 770,
        "day": 1274,
        "wkly": 0
      },
      "prod": {
        "shift": 18,
        "rc": 0,
        "day": 37,
        "wkly": 0
      },
      "exp": {
        "shift": 144,
        "day": 336,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 32,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 770,
        "day": 1274,
        "wkly": 0
      },
      "finish": {
        "shift": 690,
        "day": 1484,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 107,
      "epsD": 0,
      "epsE": 138,
      "epsF": 134,
      "epsG": 117,
      "epsH": 126,
      "s2Puma": 68,
      "shift": 690,
      "day": 1484,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 480,
      "finishShift": 146,
      "finishDay": 362,
      "finishWkly": 0,
      "balExp": 576
    },
    "loi": {
      "os": 546,
      "w2": 104,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 182,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 702
    },
    "wdxrf": {
      "osExp": 312,
      "zetiumA": {
        "prod": 0,
        "exp": 0,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 0,
        "std": 0,
        "blank": 0,
        "total": 0,
        "day": 63,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 154,
        "smelt": 0,
        "gts": 0,
        "rarr": 15,
        "ver": 16,
        "std": 42,
        "blank": 6,
        "total": 233,
        "day": 407,
        "wkly": 0
      },
      "bal": 234
    },
    "qc": {
      "os": 180,
      "finishShift": 130,
      "finishDay": 156,
      "finishWkly": 0,
      "bal": 207
    },
    "report": {
      "osReport": 0,
      "received": 132,
      "finishReportDay": 132,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-10-19_A_NIGHT",
    "no": 19,
    "date": "19/10/2026",
    "isoDate": "2026-10-19",
    "week": 43,
    "regu": "A",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 4,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 8
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 0,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 504,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 1,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 32,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 504,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 794,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 140,
      "epsD": 0,
      "epsE": 130,
      "epsF": 139,
      "epsG": 173,
      "epsH": 131,
      "s2Puma": 81,
      "shift": 794,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 576,
      "finishShift": 216,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 264
    },
    "loi": {
      "os": 702,
      "w2": 208,
      "w4": 208,
      "w5": 182,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 754
    },
    "wdxrf": {
      "osExp": 234,
      "zetiumA": {
        "prod": 0,
        "exp": 0,
        "smelt": 4,
        "gts": 0,
        "rarr": 0,
        "ver": 19,
        "std": 39,
        "blank": 1,
        "total": 63,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 19,
        "exp": 53,
        "smelt": 29,
        "gts": 0,
        "rarr": 17,
        "ver": 17,
        "std": 35,
        "blank": 4,
        "total": 174,
        "day": 0,
        "wkly": 0
      },
      "bal": 312
    },
    "qc": {
      "os": 207,
      "finishShift": 26,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 233
    },
    "report": {
      "osReport": 0,
      "received": 0,
      "finishReportDay": 0,
      "finishReportWkly": 0,
      "bal": 0
    }
  }
];
