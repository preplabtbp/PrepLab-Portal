import { DailyPerformanceRecord } from './daily-performance-types';

export const INITIAL_DAILY_PERFORMANCE_RECORDS: DailyPerformanceRecord[] = [
  {
    "id": "2026-09-01_A_DAY",
    "no": 1,
    "date": "01/09/2026",
    "isoDate": "2026-09-01",
    "week": 36,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 0,
        "lab": 11,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 13
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 600,
        "day": 1205,
        "wkly": 5468
      },
      "prod": {
        "shift": 48,
        "rc": 2,
        "day": 82,
        "wkly": 225
      },
      "exp": {
        "shift": 120,
        "day": 120,
        "wkly": 1488
      },
      "smelter": {
        "shift": 0,
        "day": 10,
        "wkly": 131
      }
    },
    "pressPowder": {
      "received": {
        "shift": 600,
        "day": 1205,
        "wkly": 5468
      },
      "finish": {
        "shift": 618,
        "day": 1517,
        "wkly": 6415
      }
    },
    "edxrf": {
      "epsC": 172,
      "epsD": 0,
      "epsE": 0,
      "epsF": 175,
      "epsG": 175,
      "epsH": 0,
      "s2Puma": 96,
      "shift": 618,
      "day": 1517,
      "wkly": 6415
    },
    "fuseBead": {
      "osExp": 456,
      "finishShift": 277,
      "finishDay": 551,
      "finishWkly": 1834,
      "balExp": 576
    },
    "loi": {
      "os": 494,
      "w2": 208,
      "w4": 234,
      "w5": 182,
      "finLoiShift": 416,
      "finLoiDay": 1118,
      "finLoiWkly": 0,
      "bal": 442
    },
    "wdxrf": {
      "osExp": 104,
      "zetiumA": {
        "prod": 23,
        "exp": 86,
        "smelt": 34,
        "gts": 0,
        "rarr": 13,
        "ver": 1,
        "std": 17,
        "blank": 4,
        "total": 178,
        "day": 350,
        "wkly": 1333
      },
      "zetiumB": {
        "prod": 0,
        "exp": 120,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 0,
        "std": 22,
        "blank": 5,
        "total": 147,
        "day": 318,
        "wkly": 1323
      },
      "bal": 130
    },
    "qc": {
      "os": 78,
      "finishShift": 130,
      "finishDay": 312,
      "finishWkly": 1092,
      "bal": 130
    },
    "report": {
      "osReport": 0,
      "received": 264,
      "finishReportDay": 264,
      "finishReportWkly": 924,
      "bal": 0
    }
  },
  {
    "id": "2026-09-01_B_NIGHT",
    "no": 1,
    "date": "01/09/2026",
    "isoDate": "2026-09-01",
    "week": 36,
    "regu": "B",
    "shiftType": "NIGHT",
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
        "bantn": 0,
        "lab": 11,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 605,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 34,
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
        "shift": 10,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 605,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 899,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 205,
      "epsD": 0,
      "epsE": 176,
      "epsF": 209,
      "epsG": 215,
      "epsH": 0,
      "s2Puma": 94,
      "shift": 899,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 576,
      "finishShift": 274,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 432
    },
    "loi": {
      "os": 442,
      "w2": 208,
      "w4": 182,
      "w5": 234,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 182
    },
    "wdxrf": {
      "osExp": 130,
      "zetiumA": {
        "prod": 50,
        "exp": 44,
        "smelt": 0,
        "gts": 0,
        "rarr": 10,
        "ver": 19,
        "std": 47,
        "blank": 2,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 111,
        "smelt": 0,
        "gts": 0,
        "rarr": 10,
        "ver": 16,
        "std": 29,
        "blank": 5,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "bal": 130
    },
    "qc": {
      "os": 130,
      "finishShift": 182,
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
    "id": "2026-09-02_A_DAY",
    "no": 2,
    "date": "02/09/2026",
    "isoDate": "2026-09-02",
    "week": 36,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 0,
        "lab": 11,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 13
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 644,
        "day": 1136,
        "wkly": 0
      },
      "prod": {
        "shift": 23,
        "rc": 1,
        "day": 38,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 120,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 29,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 644,
        "day": 1136,
        "wkly": 0
      },
      "finish": {
        "shift": 561,
        "day": 1364,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 119,
      "epsD": 0,
      "epsE": 123,
      "epsF": 130,
      "epsG": 125,
      "epsH": 0,
      "s2Puma": 64,
      "shift": 561,
      "day": 1364,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 432,
      "finishShift": 273,
      "finishDay": 449,
      "finishWkly": 0,
      "balExp": 78
    },
    "loi": {
      "os": 182,
      "w2": 78,
      "w4": 182,
      "w5": 182,
      "finLoiShift": 182,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 130,
      "zetiumA": {
        "prod": 41,
        "exp": 29,
        "smelt": 20,
        "gts": 0,
        "rarr": 10,
        "ver": 21,
        "std": 11,
        "blank": 3,
        "total": 135,
        "day": 318,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 124,
        "smelt": 0,
        "gts": 0,
        "rarr": 6,
        "ver": 0,
        "std": 30,
        "blank": 5,
        "total": 165,
        "day": 340,
        "wkly": 0
      },
      "bal": 234
    },
    "qc": {
      "os": 104,
      "finishShift": 208,
      "finishDay": 364,
      "finishWkly": 0,
      "bal": 26
    },
    "report": {
      "osReport": 0,
      "received": 308,
      "finishReportDay": 308,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-02_B_NIGHT",
    "no": 2,
    "date": "02/09/2026",
    "isoDate": "2026-09-02",
    "week": 36,
    "regu": "B",
    "shiftType": "NIGHT",
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
        "bantn": 0,
        "lab": 11,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 492,
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
        "shift": 120,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 29,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 492,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 803,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 216,
      "epsD": 0,
      "epsE": 171,
      "epsF": 170,
      "epsG": 153,
      "epsH": 0,
      "s2Puma": 93,
      "shift": 803,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 78,
      "finishShift": 176,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 120
    },
    "loi": {
      "os": 0,
      "w2": 0,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 234,
      "zetiumA": {
        "prod": 25,
        "exp": 52,
        "smelt": 9,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 56,
        "blank": 4,
        "total": 183,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 95,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 19,
        "std": 57,
        "blank": 4,
        "total": 175,
        "day": 0,
        "wkly": 0
      },
      "bal": 156
    },
    "qc": {
      "os": 26,
      "finishShift": 156,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 26
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
    "id": "2026-09-03_A_DAY",
    "no": 3,
    "date": "03/09/2026",
    "isoDate": "2026-09-03",
    "week": 36,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 0,
        "lab": 11,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 13
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 542,
        "day": 1025,
        "wkly": 0
      },
      "prod": {
        "shift": 21,
        "rc": 2,
        "day": 41,
        "wkly": 0
      },
      "exp": {
        "shift": 168,
        "day": 168,
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
        "shift": 542,
        "day": 1025,
        "wkly": 0
      },
      "finish": {
        "shift": 552,
        "day": 1198,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 107,
      "epsD": 0,
      "epsE": 137,
      "epsF": 125,
      "epsG": 123,
      "epsH": 0,
      "s2Puma": 60,
      "shift": 552,
      "day": 1198,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 158,
      "finishDay": 371,
      "finishWkly": 0,
      "balExp": 168
    },
    "loi": {
      "os": 130,
      "w2": 130,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 312,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 182
    },
    "wdxrf": {
      "osExp": 156,
      "zetiumA": {
        "prod": 19,
        "exp": 5,
        "smelt": 6,
        "gts": 0,
        "rarr": 13,
        "ver": 2,
        "std": 2,
        "blank": 2,
        "total": 49,
        "day": 205,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 131,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 4,
        "std": 28,
        "blank": 4,
        "total": 168,
        "day": 328,
        "wkly": 0
      },
      "bal": 156
    },
    "qc": {
      "os": 26,
      "finishShift": 0,
      "finishDay": 104,
      "finishWkly": 0,
      "bal": 26
    },
    "report": {
      "osReport": 0,
      "received": 88,
      "finishReportDay": 88,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-03_B_NIGHT",
    "no": 3,
    "date": "03/09/2026",
    "isoDate": "2026-09-03",
    "week": 36,
    "regu": "B",
    "shiftType": "NIGHT",
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
        "bantn": 0,
        "lab": 11,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 483,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 20,
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
        "shift": 32,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 483,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 646,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 132,
      "epsD": 0,
      "epsE": 154,
      "epsF": 153,
      "epsG": 143,
      "epsH": 0,
      "s2Puma": 64,
      "shift": 646,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 168,
      "finishShift": 213,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 182,
      "w2": 182,
      "w4": 182,
      "w5": 182,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 156,
      "zetiumA": {
        "prod": 24,
        "exp": 47,
        "smelt": 9,
        "gts": 0,
        "rarr": 5,
        "ver": 19,
        "std": 49,
        "blank": 3,
        "total": 156,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 94,
        "smelt": 0,
        "gts": 0,
        "rarr": 17,
        "ver": 16,
        "std": 29,
        "blank": 4,
        "total": 160,
        "day": 0,
        "wkly": 0
      },
      "bal": 104
    },
    "qc": {
      "os": 0,
      "finishShift": 104,
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
    "id": "2026-09-04_A_DAY",
    "no": 4,
    "date": "04/09/2026",
    "isoDate": "2026-09-04",
    "week": 36,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 11,
        "bantn": 0,
        "lab": 11,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 486,
        "day": 1009,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
        "rc": 0,
        "day": 31,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
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
        "shift": 486,
        "day": 1009,
        "wkly": 0
      },
      "finish": {
        "shift": 421,
        "day": 1132,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 92,
      "epsD": 0,
      "epsE": 97,
      "epsF": 95,
      "epsG": 91,
      "epsH": 0,
      "s2Puma": 46,
      "shift": 421,
      "day": 1132,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 116,
      "finishDay": 176,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 0,
      "w2": 0,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 78,
      "zetiumA": {
        "prod": 22,
        "exp": 52,
        "smelt": 42,
        "gts": 0,
        "rarr": 16,
        "ver": 0,
        "std": 13,
        "blank": 5,
        "total": 150,
        "day": 244,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 123,
        "smelt": 0,
        "gts": 0,
        "rarr": 15,
        "ver": 0,
        "std": 27,
        "blank": 5,
        "total": 170,
        "day": 224,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 78,
      "finishShift": 130,
      "finishDay": 260,
      "finishWkly": 0,
      "bal": 130
    },
    "report": {
      "osReport": 0,
      "received": 220,
      "finishReportDay": 220,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-04_B_NIGHT",
    "no": 4,
    "date": "04/09/2026",
    "isoDate": "2026-09-04",
    "week": 36,
    "regu": "B",
    "shiftType": "NIGHT",
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
        "bantn": 0,
        "lab": 10,
        "cuti": 4,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 523,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 16,
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
        "shift": 17,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 523,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 711,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 162,
      "epsD": 0,
      "epsE": 159,
      "epsF": 156,
      "epsG": 172,
      "epsH": 0,
      "s2Puma": 62,
      "shift": 711,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 60,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 0,
      "w2": 0,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 130,
      "zetiumA": {
        "prod": 17,
        "exp": 0,
        "smelt": 9,
        "gts": 0,
        "rarr": 7,
        "ver": 19,
        "std": 40,
        "blank": 2,
        "total": 94,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 5,
        "smelt": 0,
        "gts": 0,
        "rarr": 4,
        "ver": 16,
        "std": 29,
        "blank": 0,
        "total": 54,
        "day": 0,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 130,
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
    "id": "2026-09-05_A_DAY",
    "no": 5,
    "date": "05/09/2026",
    "isoDate": "2026-09-05",
    "week": 36,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 9,
        "bantn": 1,
        "lab": 10,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 621,
        "day": 1093,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 0,
        "day": 33,
        "wkly": 0
      },
      "exp": {
        "shift": 1032,
        "day": 1080,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 43,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 621,
        "day": 1093,
        "wkly": 0
      },
      "finish": {
        "shift": 499,
        "day": 1204,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 43,
      "epsD": 0,
      "epsE": 133,
      "epsF": 125,
      "epsG": 125,
      "epsH": 0,
      "s2Puma": 73,
      "shift": 499,
      "day": 1204,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 32,
      "finishDay": 287,
      "finishWkly": 0,
      "balExp": 984
    },
    "loi": {
      "os": 0,
      "w2": 52,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 208,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 1118
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 44,
        "exp": 0,
        "smelt": 27,
        "gts": 0,
        "rarr": 12,
        "ver": 0,
        "std": 1,
        "blank": 1,
        "total": 85,
        "day": 216,
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
        "day": 113,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 0,
      "finishShift": 0,
      "finishDay": 52,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 0,
      "received": 44,
      "finishReportDay": 44,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-05_B_NIGHT",
    "no": 5,
    "date": "05/09/2026",
    "isoDate": "2026-09-05",
    "week": 36,
    "regu": "B",
    "shiftType": "NIGHT",
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
        "bantn": 0,
        "lab": 10,
        "cuti": 4,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 472,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 14,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 48,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 43,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 472,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 705,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 157,
      "epsD": 0,
      "epsE": 156,
      "epsF": 157,
      "epsG": 174,
      "epsH": 0,
      "s2Puma": 61,
      "shift": 705,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 984,
      "finishShift": 255,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 888
    },
    "loi": {
      "os": 1118,
      "w2": 234,
      "w4": 208,
      "w5": 208,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 1014
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 19,
        "exp": 0,
        "smelt": 5,
        "gts": 32,
        "rarr": 11,
        "ver": 20,
        "std": 43,
        "blank": 1,
        "total": 131,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 55,
        "smelt": 0,
        "gts": 0,
        "rarr": 6,
        "ver": 17,
        "std": 33,
        "blank": 2,
        "total": 113,
        "day": 0,
        "wkly": 0
      },
      "bal": 52
    },
    "qc": {
      "os": 0,
      "finishShift": 52,
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
    "id": "2026-09-06_A_LS",
    "no": 6,
    "date": "06/09/2026",
    "isoDate": "2026-09-06",
    "week": 37,
    "regu": "A",
    "shiftType": "LS",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 10,
        "bantn": 1,
        "lab": 11,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 482,
        "day": 482,
        "wkly": 7646
      },
      "prod": {
        "shift": 13,
        "rc": 0,
        "day": 13,
        "wkly": 225
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 1464
      },
      "smelter": {
        "shift": 18,
        "day": 18,
        "wkly": 180
      }
    },
    "pressPowder": {
      "received": {
        "shift": 482,
        "day": 482,
        "wkly": 7608
      },
      "finish": {
        "shift": 505,
        "day": 505,
        "wkly": 8632
      }
    },
    "edxrf": {
      "epsC": 93,
      "epsD": 0,
      "epsE": 125,
      "epsF": 111,
      "epsG": 112,
      "epsH": 0,
      "s2Puma": 64,
      "shift": 505,
      "day": 505,
      "wkly": 8632
    },
    "fuseBead": {
      "osExp": 888,
      "finishShift": 346,
      "finishDay": 346,
      "finishWkly": 2654,
      "balExp": 576
    },
    "loi": {
      "os": 1014,
      "w2": 260,
      "w4": 338,
      "w5": 338,
      "finLoiShift": 338,
      "finLoiDay": 1872,
      "finLoiWkly": 0,
      "bal": 650
    },
    "wdxrf": {
      "osExp": 52,
      "zetiumA": {
        "prod": 39,
        "exp": 104,
        "smelt": 65,
        "gts": 0,
        "rarr": 16,
        "ver": 0,
        "std": 19,
        "blank": 7,
        "total": 250,
        "day": 250,
        "wkly": 2077
      },
      "zetiumB": {
        "prod": 0,
        "exp": 206,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 2,
        "std": 34,
        "blank": 7,
        "total": 261,
        "day": 261,
        "wkly": 1904
      },
      "bal": 52
    },
    "qc": {
      "os": 0,
      "finishShift": 130,
      "finishDay": 130,
      "finishWkly": 1898,
      "bal": 182
    },
    "report": {
      "osReport": 0,
      "received": 110,
      "finishReportDay": 110,
      "finishReportWkly": 1606,
      "bal": 0
    }
  },
  {
    "id": "2026-09-07_B_DAY",
    "no": 7,
    "date": "07/09/2026",
    "isoDate": "2026-09-07",
    "week": 37,
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
        "shift": 9,
        "bantn": 4,
        "lab": 13,
        "cuti": 3,
        "alpa": 0,
        "izin": 4,
        "sakit": 0,
        "total": 20
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 671,
        "day": 1362,
        "wkly": 0
      },
      "prod": {
        "shift": 10,
        "rc": 0,
        "day": 21,
        "wkly": 0
      },
      "exp": {
        "shift": 96,
        "day": 240,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 24,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 671,
        "day": 1362,
        "wkly": 0
      },
      "finish": {
        "shift": 620,
        "day": 1469,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 123,
      "epsD": 0,
      "epsE": 141,
      "epsF": 138,
      "epsG": 133,
      "epsH": 0,
      "s2Puma": 85,
      "shift": 620,
      "day": 1469,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 576,
      "finishShift": 206,
      "finishDay": 353,
      "finishWkly": 0,
      "balExp": 552
    },
    "loi": {
      "os": 650,
      "w2": 130,
      "w4": 78,
      "w5": 52,
      "finLoiShift": 234,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 702
    },
    "wdxrf": {
      "osExp": 52,
      "zetiumA": {
        "prod": 0,
        "exp": 0,
        "smelt": 30,
        "gts": 0,
        "rarr": 3,
        "ver": 19,
        "std": 41,
        "blank": 2,
        "total": 95,
        "day": 266,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 0,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 36,
        "std": 19,
        "blank": 0,
        "total": 55,
        "day": 201,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 182,
      "finishShift": 78,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 0,
      "received": 242,
      "finishReportDay": 242,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-07_A_NIGHT",
    "no": 7,
    "date": "07/09/2026",
    "isoDate": "2026-09-07",
    "week": 37,
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
        "shift": 8,
        "bantn": 2,
        "lab": 10,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 13
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 691,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 11,
        "rc": 0,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 144,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 24,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 691,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 849,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 175,
      "epsD": 0,
      "epsE": 199,
      "epsF": 200,
      "epsG": 181,
      "epsH": 0,
      "s2Puma": 94,
      "shift": 849,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 552,
      "finishShift": 147,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 648
    },
    "loi": {
      "os": 702,
      "w2": 208,
      "w4": 156,
      "w5": 182,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 676
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 12,
        "exp": 54,
        "smelt": 12,
        "gts": 0,
        "rarr": 19,
        "ver": 19,
        "std": 52,
        "blank": 3,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 58,
        "smelt": 0,
        "gts": 0,
        "rarr": 17,
        "ver": 16,
        "std": 53,
        "blank": 2,
        "total": 146,
        "day": 0,
        "wkly": 0
      },
      "bal": 182
    },
    "qc": {
      "os": 104,
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
    "id": "2026-09-08_B_DAY",
    "no": 8,
    "date": "08/09/2026",
    "isoDate": "2026-09-08",
    "week": 37,
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
        "shift": 11,
        "bantn": 3,
        "lab": 14,
        "cuti": 3,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 19
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 564,
        "day": 1069,
        "wkly": 0
      },
      "prod": {
        "shift": 21,
        "rc": 0,
        "day": 36,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
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
        "shift": 564,
        "day": 1069,
        "wkly": 0
      },
      "finish": {
        "shift": 614,
        "day": 1311,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 126,
      "epsD": 0,
      "epsE": 145,
      "epsF": 134,
      "epsG": 108,
      "epsH": 39,
      "s2Puma": 62,
      "shift": 614,
      "day": 1311,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 648,
      "finishShift": 322,
      "finishDay": 467,
      "finishWkly": 0,
      "balExp": 408
    },
    "loi": {
      "os": 676,
      "w2": 182,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 390,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 468
    },
    "wdxrf": {
      "osExp": 182,
      "zetiumA": {
        "prod": 25,
        "exp": 76,
        "smelt": 37,
        "gts": 0,
        "rarr": 11,
        "ver": 0,
        "std": 11,
        "blank": 8,
        "total": 168,
        "day": 336,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 141,
        "smelt": 0,
        "gts": 0,
        "rarr": 9,
        "ver": 0,
        "std": 15,
        "blank": 5,
        "total": 170,
        "day": 335,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 0,
      "finishShift": 26,
      "finishDay": 338,
      "finishWkly": 0,
      "bal": 208
    },
    "report": {
      "osReport": 0,
      "received": 286,
      "finishReportDay": 264,
      "finishReportWkly": 0,
      "bal": 22
    }
  },
  {
    "id": "2026-09-08_A_NIGHT",
    "no": 8,
    "date": "08/09/2026",
    "isoDate": "2026-09-08",
    "week": 37,
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
        "shift": 7,
        "bantn": 2,
        "lab": 9,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 505,
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
        "shift": 32,
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
        "shift": 697,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 108,
      "epsD": 0,
      "epsE": 124,
      "epsF": 141,
      "epsG": 134,
      "epsH": 123,
      "s2Puma": 67,
      "shift": 697,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 408,
      "finishShift": 145,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 360
    },
    "loi": {
      "os": 468,
      "w2": 78,
      "w4": 104,
      "w5": 156,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 338
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 15,
        "exp": 52,
        "smelt": 10,
        "gts": 0,
        "rarr": 26,
        "ver": 19,
        "std": 42,
        "blank": 4,
        "total": 168,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 100,
        "smelt": 0,
        "gts": 0,
        "rarr": 11,
        "ver": 16,
        "std": 34,
        "blank": 4,
        "total": 165,
        "day": 0,
        "wkly": 0
      },
      "bal": 130
    },
    "qc": {
      "os": 208,
      "finishShift": 312,
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
    "id": "2026-09-09_B_DAY",
    "no": 9,
    "date": "09/09/2026",
    "isoDate": "2026-09-09",
    "week": 37,
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
        "bantn": 2,
        "lab": 14,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 18
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 605,
        "day": 1172,
        "wkly": 0
      },
      "prod": {
        "shift": 26,
        "rc": 0,
        "day": 32,
        "wkly": 0
      },
      "exp": {
        "shift": 96,
        "day": 96,
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
        "shift": 605,
        "day": 1172,
        "wkly": 0
      },
      "finish": {
        "shift": 589,
        "day": 1322,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 95,
      "epsD": 0,
      "epsE": 114,
      "epsF": 110,
      "epsG": 107,
      "epsH": 111,
      "s2Puma": 52,
      "shift": 589,
      "day": 1322,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 360,
      "finishShift": 314,
      "finishDay": 448,
      "finishWkly": 0,
      "balExp": 216
    },
    "loi": {
      "os": 338,
      "w2": 208,
      "w4": 208,
      "w5": 182,
      "finLoiShift": 312,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 260
    },
    "wdxrf": {
      "osExp": 130,
      "zetiumA": {
        "prod": 21,
        "exp": 78,
        "smelt": 41,
        "gts": 0,
        "rarr": 16,
        "ver": 0,
        "std": 11,
        "blank": 6,
        "total": 173,
        "day": 334,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 141,
        "smelt": 0,
        "gts": 0,
        "rarr": 9,
        "ver": 1,
        "std": 16,
        "blank": 5,
        "total": 172,
        "day": 335,
        "wkly": 0
      },
      "bal": 182
    },
    "qc": {
      "os": 52,
      "finishShift": 104,
      "finishDay": 364,
      "finishWkly": 0,
      "bal": 156
    },
    "report": {
      "osReport": 22,
      "received": 308,
      "finishReportDay": 330,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-09_A_NIGHT",
    "no": 9,
    "date": "09/09/2026",
    "isoDate": "2026-09-09",
    "week": 37,
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
        "shift": 7,
        "bantn": 2,
        "lab": 9,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 567,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 6,
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
        "shift": 30,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 567,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 733,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 118,
      "epsD": 0,
      "epsE": 156,
      "epsF": 140,
      "epsG": 122,
      "epsH": 157,
      "s2Puma": 40,
      "shift": 733,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 216,
      "finishShift": 134,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 144
    },
    "loi": {
      "os": 260,
      "w2": 104,
      "w4": 104,
      "w5": 130,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 182,
      "zetiumA": {
        "prod": 25,
        "exp": 52,
        "smelt": 3,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 42,
        "blank": 2,
        "total": 161,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 92,
        "smelt": 0,
        "gts": 0,
        "rarr": 20,
        "ver": 16,
        "std": 32,
        "blank": 3,
        "total": 163,
        "day": 0,
        "wkly": 0
      },
      "bal": 104
    },
    "qc": {
      "os": 156,
      "finishShift": 260,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 26
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
    "id": "2026-09-10_B_DAY",
    "no": 10,
    "date": "10/09/2026",
    "isoDate": "2026-09-10",
    "week": 37,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 11,
        "bantn": 2,
        "lab": 13,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 17
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 593,
        "day": 1209,
        "wkly": 0
      },
      "prod": {
        "shift": 35,
        "rc": 0,
        "day": 54,
        "wkly": 0
      },
      "exp": {
        "shift": 72,
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
        "shift": 593,
        "day": 1209,
        "wkly": 0
      },
      "finish": {
        "shift": 513,
        "day": 1352,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 59,
      "epsD": 0,
      "epsE": 110,
      "epsF": 90,
      "epsG": 86,
      "epsH": 105,
      "s2Puma": 63,
      "shift": 513,
      "day": 1352,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 144,
      "finishShift": 282,
      "finishDay": 378,
      "finishWkly": 0,
      "balExp": 72
    },
    "loi": {
      "os": 130,
      "w2": 78,
      "w4": 130,
      "w5": 130,
      "finLoiShift": 208,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 78
    },
    "wdxrf": {
      "osExp": 104,
      "zetiumA": {
        "prod": 10,
        "exp": 78,
        "smelt": 52,
        "gts": 0,
        "rarr": 17,
        "ver": 2,
        "std": 7,
        "blank": 7,
        "total": 173,
        "day": 344,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 135,
        "smelt": 0,
        "gts": 0,
        "rarr": 10,
        "ver": 0,
        "std": 14,
        "blank": 6,
        "total": 165,
        "day": 327,
        "wkly": 0
      },
      "bal": 104
    },
    "qc": {
      "os": 26,
      "finishShift": 26,
      "finishDay": 338,
      "finishWkly": 0,
      "bal": 234
    },
    "report": {
      "osReport": 0,
      "received": 286,
      "finishReportDay": 264,
      "finishReportWkly": 0,
      "bal": 22
    }
  },
  {
    "id": "2026-09-10_A_NIGHT",
    "no": 10,
    "date": "10/09/2026",
    "isoDate": "2026-09-10",
    "week": 37,
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
        "shift": 7,
        "bantn": 2,
        "lab": 9,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 616,
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
        "shift": 144,
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
        "shift": 616,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 839,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 154,
      "epsD": 0,
      "epsE": 150,
      "epsF": 146,
      "epsG": 169,
      "epsH": 152,
      "s2Puma": 68,
      "shift": 839,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 72,
      "finishShift": 96,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 144
    },
    "loi": {
      "os": 78,
      "w2": 78,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 156
    },
    "wdxrf": {
      "osExp": 104,
      "zetiumA": {
        "prod": 37,
        "exp": 52,
        "smelt": 5,
        "gts": 0,
        "rarr": 13,
        "ver": 19,
        "std": 42,
        "blank": 3,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 90,
        "smelt": 0,
        "gts": 0,
        "rarr": 19,
        "ver": 16,
        "std": 33,
        "blank": 4,
        "total": 162,
        "day": 0,
        "wkly": 0
      },
      "bal": 26
    },
    "qc": {
      "os": 234,
      "finishShift": 312,
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
    "id": "2026-09-11_B_DAY",
    "no": 11,
    "date": "11/09/2026",
    "isoDate": "2026-09-11",
    "week": 37,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 2,
        "lab": 15,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 18
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 505,
        "day": 1242,
        "wkly": 0
      },
      "prod": {
        "shift": 23,
        "rc": 1,
        "day": 39,
        "wkly": 0
      },
      "exp": {
        "shift": 72,
        "day": 120,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 29,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 467,
        "day": 1204,
        "wkly": 0
      },
      "finish": {
        "shift": 370,
        "day": 1303,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 51,
      "epsD": 0,
      "epsE": 78,
      "epsF": 68,
      "epsG": 58,
      "epsH": 81,
      "s2Puma": 34,
      "shift": 370,
      "day": 1303,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 144,
      "finishShift": 254,
      "finishDay": 402,
      "finishWkly": 0,
      "balExp": 72
    },
    "loi": {
      "os": 156,
      "w2": 156,
      "w4": 156,
      "w5": 156,
      "finLoiShift": 234,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 78
    },
    "wdxrf": {
      "osExp": 26,
      "zetiumA": {
        "prod": 24,
        "exp": 69,
        "smelt": 38,
        "gts": 0,
        "rarr": 11,
        "ver": 0,
        "std": 6,
        "blank": 4,
        "total": 152,
        "day": 286,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 124,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 1,
        "std": 11,
        "blank": 4,
        "total": 141,
        "day": 254,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 52,
      "finishShift": 78,
      "finishDay": 260,
      "finishWkly": 0,
      "bal": 182
    },
    "report": {
      "osReport": 22,
      "received": 220,
      "finishReportDay": 242,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-11_A_NIGHT",
    "no": 11,
    "date": "11/09/2026",
    "isoDate": "2026-09-11",
    "week": 37,
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
        "shift": 7,
        "bantn": 2,
        "lab": 9,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 737,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 16,
        "rc": 1,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 48,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 29,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 737,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 933,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 160,
      "epsD": 0,
      "epsE": 172,
      "epsF": 169,
      "epsG": 167,
      "epsH": 177,
      "s2Puma": 88,
      "shift": 933,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 72,
      "finishShift": 148,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 48
    },
    "loi": {
      "os": 78,
      "w2": 78,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 52
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 26,
        "exp": 38,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 19,
        "std": 38,
        "blank": 1,
        "total": 134,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 58,
        "smelt": 0,
        "gts": 0,
        "rarr": 3,
        "ver": 16,
        "std": 34,
        "blank": 2,
        "total": 113,
        "day": 0,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 182,
      "finishShift": 182,
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
    "id": "2026-09-12_B_DAY",
    "no": 12,
    "date": "12/09/2026",
    "isoDate": "2026-09-12",
    "week": 37,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 2,
        "lab": 15,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 18
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 526,
        "day": 1110,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 0,
        "day": 30,
        "wkly": 0
      },
      "exp": {
        "shift": 792,
        "day": 792,
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
        "shift": 526,
        "day": 1110,
        "wkly": 0
      },
      "finish": {
        "shift": 590,
        "day": 1370,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 99,
      "epsD": 0,
      "epsE": 112,
      "epsF": 107,
      "epsG": 100,
      "epsH": 112,
      "s2Puma": 60,
      "shift": 590,
      "day": 1370,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 48,
      "finishShift": 168,
      "finishDay": 260,
      "finishWkly": 0,
      "balExp": 744
    },
    "loi": {
      "os": 52,
      "w2": 130,
      "w4": 104,
      "w5": 52,
      "finLoiShift": 156,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 858
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 47,
        "exp": 0,
        "smelt": 54,
        "gts": 12,
        "rarr": 11,
        "ver": 0,
        "std": 4,
        "blank": 4,
        "total": 132,
        "day": 261,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 82,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 1,
        "std": 6,
        "blank": 3,
        "total": 92,
        "day": 191,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 78,
      "finishShift": 78,
      "finishDay": 182,
      "finishWkly": 0,
      "bal": 104
    },
    "report": {
      "osReport": 0,
      "received": 154,
      "finishReportDay": 154,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-12_A_NIGHT",
    "no": 12,
    "date": "12/09/2026",
    "isoDate": "2026-09-12",
    "week": 37,
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
        "shift": 7,
        "bantn": 2,
        "lab": 9,
        "cuti": 4,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 584,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 11,
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
        "shift": 26,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 584,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 780,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 132,
      "epsD": 0,
      "epsE": 150,
      "epsF": 153,
      "epsG": 142,
      "epsH": 142,
      "s2Puma": 61,
      "shift": 780,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 744,
      "finishShift": 92,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 696
    },
    "loi": {
      "os": 858,
      "w2": 52,
      "w4": 52,
      "w5": 104,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 754
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 14,
        "exp": 0,
        "smelt": 13,
        "gts": 30,
        "rarr": 8,
        "ver": 19,
        "std": 43,
        "blank": 2,
        "total": 129,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 50,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 16,
        "std": 31,
        "blank": 1,
        "total": 99,
        "day": 0,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 104,
      "finishShift": 104,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 26
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
    "id": "2026-09-13_B_LS",
    "no": 13,
    "date": "13/09/2026",
    "isoDate": "2026-09-13",
    "week": 38,
    "regu": "B",
    "shiftType": "LS",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 12,
        "bantn": 2,
        "lab": 14,
        "cuti": 1,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 17
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 627,
        "day": 627,
        "wkly": 7626
      },
      "prod": {
        "shift": 22,
        "rc": 1,
        "day": 22,
        "wkly": 266
      },
      "exp": {
        "shift": 120,
        "day": 120,
        "wkly": 2304
      },
      "smelter": {
        "shift": 31,
        "day": 31,
        "wkly": 190
      }
    },
    "pressPowder": {
      "received": {
        "shift": 627,
        "day": 627,
        "wkly": 7583
      },
      "finish": {
        "shift": 760,
        "day": 760,
        "wkly": 8763
      }
    },
    "edxrf": {
      "epsC": 135,
      "epsD": 0,
      "epsE": 141,
      "epsF": 141,
      "epsG": 133,
      "epsH": 151,
      "s2Puma": 59,
      "shift": 760,
      "day": 760,
      "wkly": 8763
    },
    "fuseBead": {
      "osExp": 696,
      "finishShift": 369,
      "finishDay": 369,
      "finishWkly": 3055,
      "balExp": 480
    },
    "loi": {
      "os": 754,
      "w2": 182,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 234,
      "finLoiDay": 2002,
      "finLoiWkly": 0,
      "bal": 650
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 43,
        "exp": 116,
        "smelt": 51,
        "gts": 0,
        "rarr": 9,
        "ver": 0,
        "std": 10,
        "blank": 5,
        "total": 234,
        "day": 234,
        "wkly": 2120
      },
      "zetiumB": {
        "prod": 0,
        "exp": 156,
        "smelt": 0,
        "gts": 0,
        "rarr": 8,
        "ver": 0,
        "std": 14,
        "blank": 5,
        "total": 183,
        "day": 183,
        "wkly": 1884
      },
      "bal": 52
    },
    "qc": {
      "os": 26,
      "finishShift": 52,
      "finishDay": 52,
      "finishWkly": 1898,
      "bal": 234
    },
    "report": {
      "osReport": 0,
      "received": 44,
      "finishReportDay": 0,
      "finishReportWkly": 1518,
      "bal": 44
    }
  },
  {
    "id": "2026-09-14_A_DAY",
    "no": 14,
    "date": "14/09/2026",
    "isoDate": "2026-09-14",
    "week": 38,
    "regu": "A",
    "shiftType": "DAY",
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
        "shift": 8,
        "bantn": 0,
        "lab": 8,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 12
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 672,
        "day": 1356,
        "wkly": 0
      },
      "prod": {
        "shift": 13,
        "rc": 0,
        "day": 48,
        "wkly": 0
      },
      "exp": {
        "shift": 96,
        "day": 96,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 34,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 672,
        "day": 1356,
        "wkly": 0
      },
      "finish": {
        "shift": 495,
        "day": 1548,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 75,
      "epsD": 0,
      "epsE": 102,
      "epsF": 89,
      "epsG": 86,
      "epsH": 114,
      "s2Puma": 29,
      "shift": 495,
      "day": 1548,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 480,
      "finishShift": 126,
      "finishDay": 482,
      "finishWkly": 0,
      "balExp": 528
    },
    "loi": {
      "os": 650,
      "w2": 104,
      "w4": 78,
      "w5": 52,
      "finLoiShift": 260,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 702
    },
    "wdxrf": {
      "osExp": 52,
      "zetiumA": {
        "prod": 0,
        "exp": 40,
        "smelt": 36,
        "gts": 0,
        "rarr": 12,
        "ver": 20,
        "std": 50,
        "blank": 7,
        "total": 165,
        "day": 314,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 26,
        "smelt": 0,
        "gts": 0,
        "rarr": 2,
        "ver": 17,
        "std": 31,
        "blank": 1,
        "total": 77,
        "day": 221,
        "wkly": 0
      },
      "bal": 26
    },
    "qc": {
      "os": 234,
      "finishShift": 234,
      "finishDay": 260,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 44,
      "received": 220,
      "finishReportDay": 242,
      "finishReportWkly": 0,
      "bal": 22
    }
  },
  {
    "id": "2026-09-14_B_NIGHT",
    "no": 14,
    "date": "14/09/2026",
    "isoDate": "2026-09-14",
    "week": 38,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 684,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 35,
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
        "shift": 34,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 684,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 1053,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 180,
      "epsD": 0,
      "epsE": 190,
      "epsF": 190,
      "epsG": 183,
      "epsH": 197,
      "s2Puma": 113,
      "shift": 1053,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 528,
      "finishShift": 356,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 336
    },
    "loi": {
      "os": 702,
      "w2": 260,
      "w4": 234,
      "w5": 208,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 494
    },
    "wdxrf": {
      "osExp": 26,
      "zetiumA": {
        "prod": 15,
        "exp": 26,
        "smelt": 24,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 44,
        "blank": 3,
        "total": 149,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 89,
        "smelt": 0,
        "gts": 0,
        "rarr": 0,
        "ver": 16,
        "std": 35,
        "blank": 4,
        "total": 144,
        "day": 0,
        "wkly": 0
      },
      "bal": 156
    },
    "qc": {
      "os": 78,
      "finishShift": 26,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 156
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
    "id": "2026-09-15_A_DAY",
    "no": 15,
    "date": "15/09/2026",
    "isoDate": "2026-09-15",
    "week": 38,
    "regu": "A",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 10,
        "bantn": 1,
        "lab": 11,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 585,
        "day": 1197,
        "wkly": 0
      },
      "prod": {
        "shift": 27,
        "rc": 0,
        "day": 42,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 240,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 14,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 585,
        "day": 1197,
        "wkly": 0
      },
      "finish": {
        "shift": 470,
        "day": 1397,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 59,
      "epsD": 0,
      "epsE": 117,
      "epsF": 87,
      "epsG": 71,
      "epsH": 109,
      "s2Puma": 27,
      "shift": 470,
      "day": 1397,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 336,
      "finishShift": 223,
      "finishDay": 538,
      "finishWkly": 0,
      "balExp": 408
    },
    "loi": {
      "os": 494,
      "w2": 234,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 442,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 468
    },
    "wdxrf": {
      "osExp": 156,
      "zetiumA": {
        "prod": 37,
        "exp": 38,
        "smelt": 54,
        "gts": 0,
        "rarr": 30,
        "ver": 0,
        "std": 10,
        "blank": 4,
        "total": 173,
        "day": 346,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 124,
        "smelt": 0,
        "gts": 0,
        "rarr": 21,
        "ver": 0,
        "std": 23,
        "blank": 4,
        "total": 172,
        "day": 342,
        "wkly": 0
      },
      "bal": 156
    },
    "qc": {
      "os": 156,
      "finishShift": 182,
      "finishDay": 364,
      "finishWkly": 0,
      "bal": 130
    },
    "report": {
      "osReport": 22,
      "received": 308,
      "finishReportDay": 132,
      "finishReportWkly": 0,
      "bal": 198
    }
  },
  {
    "id": "2026-09-15_B_NIGHT",
    "no": 15,
    "date": "15/09/2026",
    "isoDate": "2026-09-15",
    "week": 38,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 0,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 612,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
        "rc": 2,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 48,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 14,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 612,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 927,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 156,
      "epsD": 0,
      "epsE": 163,
      "epsF": 171,
      "epsG": 160,
      "epsH": 183,
      "s2Puma": 94,
      "shift": 927,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 408,
      "finishShift": 315,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 192
    },
    "loi": {
      "os": 468,
      "w2": 156,
      "w4": 182,
      "w5": 208,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 312
    },
    "wdxrf": {
      "osExp": 156,
      "zetiumA": {
        "prod": 29,
        "exp": 40,
        "smelt": 12,
        "gts": 0,
        "rarr": 23,
        "ver": 19,
        "std": 47,
        "blank": 3,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 103,
        "smelt": 0,
        "gts": 0,
        "rarr": 11,
        "ver": 17,
        "std": 35,
        "blank": 4,
        "total": 170,
        "day": 0,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 130,
      "finishShift": 182,
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
    "id": "2026-09-16_A_DAY",
    "no": 16,
    "date": "16/09/2026",
    "isoDate": "2026-09-16",
    "week": 38,
    "regu": "A",
    "shiftType": "DAY",
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
        "shift": 10,
        "bantn": 1,
        "lab": 11,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 609,
        "day": 1140,
        "wkly": 0
      },
      "prod": {
        "shift": 23,
        "rc": 0,
        "day": 35,
        "wkly": 0
      },
      "exp": {
        "shift": 168,
        "day": 168,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 25,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 609,
        "day": 1140,
        "wkly": 0
      },
      "finish": {
        "shift": 460,
        "day": 1313,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 75,
      "epsD": 0,
      "epsE": 94,
      "epsF": 89,
      "epsG": 77,
      "epsH": 94,
      "s2Puma": 31,
      "shift": 460,
      "day": 1313,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 216,
      "finishShift": 184,
      "finishDay": 559,
      "finishWkly": 0,
      "balExp": 240
    },
    "loi": {
      "os": 312,
      "w2": 234,
      "w4": 208,
      "w5": 234,
      "finLoiShift": 468,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 260
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 19,
        "exp": 93,
        "smelt": 16,
        "gts": 0,
        "rarr": 23,
        "ver": 0,
        "std": 16,
        "blank": 6,
        "total": 173,
        "day": 345,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 128,
        "smelt": 0,
        "gts": 0,
        "rarr": 16,
        "ver": 1,
        "std": 18,
        "blank": 5,
        "total": 168,
        "day": 340,
        "wkly": 0
      },
      "bal": 104
    },
    "qc": {
      "os": 130,
      "finishShift": 104,
      "finishDay": 338,
      "finishWkly": 0,
      "bal": 234
    },
    "report": {
      "osReport": 198,
      "received": 286,
      "finishReportDay": 286,
      "finishReportWkly": 0,
      "bal": 198
    }
  },
  {
    "id": "2026-09-16_B_NIGHT",
    "no": 16,
    "date": "16/09/2026",
    "isoDate": "2026-09-16",
    "week": 38,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 9,
        "cuti": 0,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 531,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 12,
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
        "shift": 25,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 531,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 853,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 146,
      "epsD": 0,
      "epsE": 159,
      "epsF": 152,
      "epsG": 157,
      "epsH": 155,
      "s2Puma": 84,
      "shift": 853,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 240,
      "finishShift": 375,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 260,
      "w2": 182,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 26
    },
    "wdxrf": {
      "osExp": 104,
      "zetiumA": {
        "prod": 32,
        "exp": 63,
        "smelt": 6,
        "gts": 0,
        "rarr": 10,
        "ver": 19,
        "std": 40,
        "blank": 2,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 107,
        "smelt": 0,
        "gts": 0,
        "rarr": 5,
        "ver": 17,
        "std": 39,
        "blank": 4,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 234,
      "finishShift": 234,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 156
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
    "id": "2026-09-17_A_DAY",
    "no": 17,
    "date": "17/09/2026",
    "isoDate": "2026-09-17",
    "week": 38,
    "regu": "A",
    "shiftType": "DAY",
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
        "shift": 10,
        "bantn": 2,
        "lab": 12,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 578,
        "day": 1217,
        "wkly": 0
      },
      "prod": {
        "shift": 26,
        "rc": 0,
        "day": 42,
        "wkly": 0
      },
      "exp": {
        "shift": 96,
        "day": 168,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 27,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 578,
        "day": 1217,
        "wkly": 0
      },
      "finish": {
        "shift": 510,
        "day": 1289,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 82,
      "epsD": 0,
      "epsE": 96,
      "epsF": 94,
      "epsG": 98,
      "epsH": 96,
      "s2Puma": 44,
      "shift": 510,
      "day": 1289,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 156,
      "finishDay": 366,
      "finishWkly": 0,
      "balExp": 96
    },
    "loi": {
      "os": 26,
      "w2": 0,
      "w4": 26,
      "w5": 26,
      "finLoiShift": 130,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 104
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 18,
        "exp": 78,
        "smelt": 33,
        "gts": 0,
        "rarr": 27,
        "ver": 0,
        "std": 11,
        "blank": 6,
        "total": 173,
        "day": 340,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 130,
        "smelt": 0,
        "gts": 0,
        "rarr": 18,
        "ver": 0,
        "std": 19,
        "blank": 5,
        "total": 172,
        "day": 328,
        "wkly": 0
      },
      "bal": 104
    },
    "qc": {
      "os": 156,
      "finishShift": 182,
      "finishDay": 442,
      "finishWkly": 0,
      "bal": 182
    },
    "report": {
      "osReport": 198,
      "received": 374,
      "finishReportDay": 330,
      "finishReportWkly": 0,
      "bal": 242
    }
  },
  {
    "id": "2026-09-17_B_NIGHT",
    "no": 17,
    "date": "17/09/2026",
    "isoDate": "2026-09-17",
    "week": 38,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 639,
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
        "shift": 72,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 27,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 639,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 779,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 129,
      "epsD": 0,
      "epsE": 144,
      "epsF": 127,
      "epsG": 136,
      "epsH": 159,
      "s2Puma": 84,
      "shift": 779,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 96,
      "finishShift": 210,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 104,
      "w2": 156,
      "w4": 104,
      "w5": 104,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 78
    },
    "wdxrf": {
      "osExp": 104,
      "zetiumA": {
        "prod": 32,
        "exp": 53,
        "smelt": 5,
        "gts": 0,
        "rarr": 10,
        "ver": 19,
        "std": 45,
        "blank": 3,
        "total": 167,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 105,
        "smelt": 0,
        "gts": 0,
        "rarr": 2,
        "ver": 16,
        "std": 29,
        "blank": 4,
        "total": 156,
        "day": 0,
        "wkly": 0
      },
      "bal": 52
    },
    "qc": {
      "os": 182,
      "finishShift": 260,
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
    "id": "2026-09-18_A_DAY",
    "no": 18,
    "date": "18/09/2026",
    "isoDate": "2026-09-18",
    "week": 38,
    "regu": "A",
    "shiftType": "DAY",
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
        "shift": 10,
        "bantn": 1,
        "lab": 11,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 456,
        "day": 1020,
        "wkly": 0
      },
      "prod": {
        "shift": 25,
        "rc": 0,
        "day": 43,
        "wkly": 0
      },
      "exp": {
        "shift": 120,
        "day": 120,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 39,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 456,
        "day": 977,
        "wkly": 0
      },
      "finish": {
        "shift": 385,
        "day": 1260,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 66,
      "epsD": 0,
      "epsE": 68,
      "epsF": 81,
      "epsG": 68,
      "epsH": 71,
      "s2Puma": 31,
      "shift": 385,
      "day": 1260,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 147,
      "finishDay": 383,
      "finishWkly": 0,
      "balExp": 120
    },
    "loi": {
      "os": 78,
      "w2": 26,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 208,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 52,
      "zetiumA": {
        "prod": 19,
        "exp": 26,
        "smelt": 46,
        "gts": 0,
        "rarr": 36,
        "ver": 0,
        "std": 7,
        "blank": 3,
        "total": 137,
        "day": 283,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 100,
        "smelt": 0,
        "gts": 0,
        "rarr": 17,
        "ver": 0,
        "std": 27,
        "blank": 4,
        "total": 148,
        "day": 261,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 78,
      "finishShift": 130,
      "finishDay": 260,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 242,
      "received": 220,
      "finishReportDay": 330,
      "finishReportWkly": 0,
      "bal": 132
    }
  },
  {
    "id": "2026-09-18_B_NIGHT",
    "no": 18,
    "date": "18/09/2026",
    "isoDate": "2026-09-18",
    "week": 38,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 564,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 18,
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
        "shift": 39,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 521,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 875,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 135,
      "epsD": 0,
      "epsE": 158,
      "epsF": 155,
      "epsG": 153,
      "epsH": 175,
      "s2Puma": 99,
      "shift": 875,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 236,
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
      "osExp": 0,
      "zetiumA": {
        "prod": 31,
        "exp": 26,
        "smelt": 6,
        "gts": 0,
        "rarr": 22,
        "ver": 19,
        "std": 40,
        "blank": 2,
        "total": 146,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 57,
        "smelt": 0,
        "gts": 0,
        "rarr": 7,
        "ver": 16,
        "std": 31,
        "blank": 2,
        "total": 113,
        "day": 0,
        "wkly": 0
      },
      "bal": 52
    },
    "qc": {
      "os": 78,
      "finishShift": 130,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 26
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
    "id": "2026-09-19_A_DAY",
    "no": 19,
    "date": "19/09/2026",
    "isoDate": "2026-09-19",
    "week": 38,
    "regu": "A",
    "shiftType": "DAY",
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
        "shift": 10,
        "bantn": 1,
        "lab": 11,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 482,
        "day": 1069,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
        "rc": 0,
        "day": 34,
        "wkly": 0
      },
      "exp": {
        "shift": 1392,
        "day": 1392,
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
        "shift": 482,
        "day": 1069,
        "wkly": 0
      },
      "finish": {
        "shift": 411,
        "day": 1196,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 71,
      "epsD": 0,
      "epsE": 83,
      "epsF": 75,
      "epsG": 75,
      "epsH": 82,
      "s2Puma": 25,
      "shift": 411,
      "day": 1196,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 50,
      "finishDay": 358,
      "finishWkly": 0,
      "balExp": 1344
    },
    "loi": {
      "os": 0,
      "w2": 156,
      "w4": 104,
      "w5": 0,
      "finLoiShift": 260,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 1508
    },
    "wdxrf": {
      "osExp": 52,
      "zetiumA": {
        "prod": 18,
        "exp": 0,
        "smelt": 53,
        "gts": 0,
        "rarr": 37,
        "ver": 0,
        "std": 2,
        "blank": 3,
        "total": 113,
        "day": 258,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 52,
        "smelt": 0,
        "gts": 0,
        "rarr": 16,
        "ver": 0,
        "std": 10,
        "blank": 2,
        "total": 80,
        "day": 209,
        "wkly": 0
      },
      "bal": 0
    },
    "qc": {
      "os": 26,
      "finishShift": 78,
      "finishDay": 182,
      "finishWkly": 0,
      "bal": 0
    },
    "report": {
      "osReport": 132,
      "received": 154,
      "finishReportDay": 198,
      "finishReportWkly": 0,
      "bal": 88
    }
  },
  {
    "id": "2026-09-19_B_NIGHT",
    "no": 19,
    "date": "19/09/2026",
    "isoDate": "2026-09-19",
    "week": 38,
    "regu": "B",
    "shiftType": "NIGHT",
    "manpower": {
      "staff": {
        "shift": 8,
        "cuti": 1,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 9
      },
      "crew": {
        "shift": 12,
        "bantn": 0,
        "lab": 12,
        "cuti": 2,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 587,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 15,
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
        "shift": 20,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 587,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 785,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 121,
      "epsD": 0,
      "epsE": 143,
      "epsF": 142,
      "epsG": 134,
      "epsH": 155,
      "s2Puma": 90,
      "shift": 785,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 1344,
      "finishShift": 308,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 1104
    },
    "loi": {
      "os": 1508,
      "w2": 208,
      "w4": 156,
      "w5": 260,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 1222
    },
    "wdxrf": {
      "osExp": 0,
      "zetiumA": {
        "prod": 33,
        "exp": 26,
        "smelt": 10,
        "gts": 0,
        "rarr": 12,
        "ver": 19,
        "std": 43,
        "blank": 2,
        "total": 145,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 78,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 17,
        "std": 30,
        "blank": 3,
        "total": 129,
        "day": 0,
        "wkly": 0
      },
      "bal": 78
    },
    "qc": {
      "os": 0,
      "finishShift": 104,
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
    "id": "2026-09-20_A_LS",
    "no": 20,
    "date": "20/09/2026",
    "isoDate": "2026-09-20",
    "week": 39,
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
        "shift": 9,
        "bantn": 2,
        "lab": 11,
        "cuti": 3,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 793,
        "day": 793,
        "wkly": 6883
      },
      "prod": {
        "shift": 28,
        "rc": 0,
        "day": 28,
        "wkly": 238
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 1800
      },
      "smelter": {
        "shift": 24,
        "day": 24,
        "wkly": 200
      }
    },
    "pressPowder": {
      "received": {
        "shift": 793,
        "day": 793,
        "wkly": 6883
      },
      "finish": {
        "shift": 905,
        "day": 905,
        "wkly": 8072
      }
    },
    "edxrf": {
      "epsC": 151,
      "epsD": 0,
      "epsE": 171,
      "epsF": 173,
      "epsG": 162,
      "epsH": 172,
      "s2Puma": 76,
      "shift": 905,
      "day": 905,
      "wkly": 8072
    },
    "fuseBead": {
      "osExp": 1104,
      "finishShift": 329,
      "finishDay": 329,
      "finishWkly": 3575,
      "balExp": 792
    },
    "loi": {
      "os": 1222,
      "w2": 130,
      "w4": 208,
      "w5": 208,
      "finLoiShift": 208,
      "finLoiDay": 2184,
      "finLoiWkly": 0,
      "bal": 1040
    },
    "wdxrf": {
      "osExp": 78,
      "zetiumA": {
        "prod": 30,
        "exp": 86,
        "smelt": 28,
        "gts": 32,
        "rarr": 29,
        "ver": 0,
        "std": 28,
        "blank": 6,
        "total": 239,
        "day": 239,
        "wkly": 2326
      },
      "zetiumB": {
        "prod": 0,
        "exp": 182,
        "smelt": 0,
        "gts": 0,
        "rarr": 24,
        "ver": 0,
        "std": 30,
        "blank": 7,
        "total": 243,
        "day": 243,
        "wkly": 2093
      },
      "bal": 78
    },
    "qc": {
      "os": 0,
      "finishShift": 104,
      "finishDay": 104,
      "finishWkly": 1820,
      "bal": 156
    },
    "report": {
      "osReport": 88,
      "received": 88,
      "finishReportDay": 88,
      "finishReportWkly": 1474,
      "bal": 88
    }
  },
  {
    "id": "2026-09-21_B_DAY",
    "no": 21,
    "date": "21/09/2026",
    "isoDate": "2026-09-21",
    "week": 39,
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
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 664,
        "day": 1227,
        "wkly": 0
      },
      "prod": {
        "shift": 6,
        "rc": 0,
        "day": 44,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 192,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 27,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 664,
        "day": 1227,
        "wkly": 0
      },
      "finish": {
        "shift": 754,
        "day": 1473,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 191,
      "epsD": 0,
      "epsE": 117,
      "epsF": 111,
      "epsG": 121,
      "epsH": 122,
      "s2Puma": 92,
      "shift": 754,
      "day": 1473,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 792,
      "finishShift": 262,
      "finishDay": 541,
      "finishWkly": 0,
      "balExp": 864
    },
    "loi": {
      "os": 1040,
      "w2": 234,
      "w4": 156,
      "w5": 104,
      "finLoiShift": 364,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 1144
    },
    "wdxrf": {
      "osExp": 78,
      "zetiumA": {
        "prod": 0,
        "exp": 77,
        "smelt": 15,
        "gts": 0,
        "rarr": 30,
        "ver": 19,
        "std": 52,
        "blank": 6,
        "total": 199,
        "day": 371,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 0,
        "smelt": 0,
        "gts": 0,
        "rarr": 6,
        "ver": 27,
        "std": 35,
        "blank": 0,
        "total": 68,
        "day": 219,
        "wkly": 0
      },
      "bal": 156
    },
    "qc": {
      "os": 0,
      "finishShift": 156,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 88,
      "received": 242,
      "finishReportDay": 198,
      "finishReportWkly": 0,
      "bal": 132
    }
  },
  {
    "id": "2026-09-21_A_NIGHT",
    "no": 21,
    "date": "21/09/2026",
    "isoDate": "2026-09-21",
    "week": 39,
    "regu": "A",
    "shiftType": "NIGHT",
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
        "shift": 11,
        "bantn": 2,
        "lab": 13,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 563,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 38,
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
        "shift": 27,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 563,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 719,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 144,
      "epsD": 0,
      "epsE": 131,
      "epsF": 127,
      "epsG": 141,
      "epsH": 123,
      "s2Puma": 53,
      "shift": 719,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 864,
      "finishShift": 279,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 672
    },
    "loi": {
      "os": 1144,
      "w2": 234,
      "w4": 208,
      "w5": 260,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 910
    },
    "wdxrf": {
      "osExp": 156,
      "zetiumA": {
        "prod": 26,
        "exp": 26,
        "smelt": 30,
        "gts": 0,
        "rarr": 30,
        "ver": 19,
        "std": 39,
        "blank": 2,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 78,
        "smelt": 0,
        "gts": 0,
        "rarr": 10,
        "ver": 16,
        "std": 44,
        "blank": 3,
        "total": 151,
        "day": 0,
        "wkly": 0
      },
      "bal": 208
    },
    "qc": {
      "os": 52,
      "finishShift": 130,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 26
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
    "id": "2026-09-22_B_DAY",
    "no": 22,
    "date": "22/09/2026",
    "isoDate": "2026-09-22",
    "week": 39,
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
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 431,
        "day": 951,
        "wkly": 0
      },
      "prod": {
        "shift": 17,
        "rc": 0,
        "day": 30,
        "wkly": 0
      },
      "exp": {
        "shift": 168,
        "day": 168,
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
        "shift": 431,
        "day": 951,
        "wkly": 0
      },
      "finish": {
        "shift": 571,
        "day": 1172,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 107,
      "epsD": 0,
      "epsE": 100,
      "epsF": 96,
      "epsG": 95,
      "epsH": 115,
      "s2Puma": 58,
      "shift": 571,
      "day": 1172,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 696,
      "finishShift": 442,
      "finishDay": 723,
      "finishWkly": 0,
      "balExp": 720
    },
    "loi": {
      "os": 858,
      "w2": 260,
      "w4": 286,
      "w5": 260,
      "finLoiShift": 494,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 780
    },
    "wdxrf": {
      "osExp": 208,
      "zetiumA": {
        "prod": 55,
        "exp": 29,
        "smelt": 50,
        "gts": 0,
        "rarr": 25,
        "ver": 0,
        "std": 10,
        "blank": 5,
        "total": 174,
        "day": 348,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 126,
        "smelt": 0,
        "gts": 0,
        "rarr": 14,
        "ver": 0,
        "std": 24,
        "blank": 5,
        "total": 169,
        "day": 318,
        "wkly": 0
      },
      "bal": 442
    },
    "qc": {
      "os": 26,
      "finishShift": 104,
      "finishDay": 312,
      "finishWkly": 0,
      "bal": 52
    },
    "report": {
      "osReport": 132,
      "received": 264,
      "finishReportDay": 220,
      "finishReportWkly": 0,
      "bal": 176
    }
  },
  {
    "id": "2026-09-22_A_NIGHT",
    "no": 22,
    "date": "22/09/2026",
    "isoDate": "2026-09-22",
    "week": 39,
    "regu": "A",
    "shiftType": "NIGHT",
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
        "shift": 11,
        "bantn": 2,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 520,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 13,
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
        "shift": 32,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 520,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 601,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 101,
      "epsD": 0,
      "epsE": 119,
      "epsF": 117,
      "epsG": 111,
      "epsH": 109,
      "s2Puma": 44,
      "shift": 601,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 720,
      "finishShift": 281,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 408
    },
    "loi": {
      "os": 780,
      "w2": 260,
      "w4": 234,
      "w5": 234,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 546
    },
    "wdxrf": {
      "osExp": 442,
      "zetiumA": {
        "prod": 7,
        "exp": 75,
        "smelt": 4,
        "gts": 0,
        "rarr": 18,
        "ver": 19,
        "std": 47,
        "blank": 4,
        "total": 174,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 83,
        "smelt": 0,
        "gts": 0,
        "rarr": 13,
        "ver": 16,
        "std": 34,
        "blank": 3,
        "total": 149,
        "day": 0,
        "wkly": 0
      },
      "bal": 442
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
    "id": "2026-09-23_B_DAY",
    "no": 23,
    "date": "23/09/2026",
    "isoDate": "2026-09-23",
    "week": 39,
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
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 526,
        "day": 1105,
        "wkly": 0
      },
      "prod": {
        "shift": 9,
        "rc": 1,
        "day": 21,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 192,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 28,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 526,
        "day": 1105,
        "wkly": 0
      },
      "finish": {
        "shift": 491,
        "day": 1221,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 100,
      "epsD": 0,
      "epsE": 111,
      "epsF": 107,
      "epsG": 103,
      "epsH": 0,
      "s2Puma": 70,
      "shift": 491,
      "day": 1221,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 408,
      "finishShift": 399,
      "finishDay": 705,
      "finishWkly": 0,
      "balExp": 336
    },
    "loi": {
      "os": 546,
      "w2": 260,
      "w4": 286,
      "w5": 286,
      "finLoiShift": 546,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 468
    },
    "wdxrf": {
      "osExp": 442,
      "zetiumA": {
        "prod": 16,
        "exp": 49,
        "smelt": 59,
        "gts": 0,
        "rarr": 28,
        "ver": 11,
        "std": 0,
        "blank": 6,
        "total": 169,
        "day": 333,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 137,
        "smelt": 0,
        "gts": 0,
        "rarr": 9,
        "ver": 19,
        "std": 0,
        "blank": 6,
        "total": 171,
        "day": 335,
        "wkly": 0
      },
      "bal": 598
    },
    "qc": {
      "os": 0,
      "finishShift": 104,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 176,
      "received": 242,
      "finishReportDay": 286,
      "finishReportWkly": 0,
      "bal": 132
    }
  },
  {
    "id": "2026-09-23_A_NIGHT",
    "no": 23,
    "date": "23/09/2026",
    "isoDate": "2026-09-23",
    "week": 39,
    "regu": "A",
    "shiftType": "NIGHT",
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
        "shift": 10,
        "bantn": 2,
        "lab": 12,
        "cuti": 2,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 579,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 12,
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
        "shift": 28,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 579,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 730,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 155,
      "epsD": 0,
      "epsE": 166,
      "epsF": 170,
      "epsG": 174,
      "epsH": 0,
      "s2Puma": 65,
      "shift": 730,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 336,
      "finishShift": 306,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 192
    },
    "loi": {
      "os": 468,
      "w2": 286,
      "w4": 260,
      "w5": 260,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 208
    },
    "wdxrf": {
      "osExp": 598,
      "zetiumA": {
        "prod": 19,
        "exp": 56,
        "smelt": 0,
        "gts": 0,
        "rarr": 23,
        "ver": 19,
        "std": 45,
        "blank": 2,
        "total": 164,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 97,
        "smelt": 0,
        "gts": 0,
        "rarr": 7,
        "ver": 16,
        "std": 41,
        "blank": 3,
        "total": 164,
        "day": 0,
        "wkly": 0
      },
      "bal": 598
    },
    "qc": {
      "os": 78,
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
    "id": "2026-09-24_B_DAY",
    "no": 24,
    "date": "24/09/2026",
    "isoDate": "2026-09-24",
    "week": 39,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 14,
        "bantn": 0,
        "lab": 14,
        "cuti": 2,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 478,
        "day": 993,
        "wkly": 0
      },
      "prod": {
        "shift": 14,
        "rc": 0,
        "day": 27,
        "wkly": 0
      },
      "exp": {
        "shift": 120,
        "day": 120,
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
        "shift": 478,
        "day": 993,
        "wkly": 0
      },
      "finish": {
        "shift": 502,
        "day": 1168,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 106,
      "epsD": 0,
      "epsE": 110,
      "epsF": 119,
      "epsG": 97,
      "epsH": 0,
      "s2Puma": 70,
      "shift": 502,
      "day": 1168,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 192,
      "finishShift": 329,
      "finishDay": 495,
      "finishWkly": 0,
      "balExp": 120
    },
    "loi": {
      "os": 208,
      "w2": 78,
      "w4": 182,
      "w5": 208,
      "finLoiShift": 338,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 130
    },
    "wdxrf": {
      "osExp": 598,
      "zetiumA": {
        "prod": 14,
        "exp": 19,
        "smelt": 88,
        "gts": 0,
        "rarr": 39,
        "ver": 0,
        "std": 8,
        "blank": 5,
        "total": 173,
        "day": 335,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 139,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 13,
        "std": 0,
        "blank": 5,
        "total": 169,
        "day": 320,
        "wkly": 0
      },
      "bal": 702
    },
    "qc": {
      "os": 52,
      "finishShift": 130,
      "finishDay": 234,
      "finishWkly": 0,
      "bal": 78
    },
    "report": {
      "osReport": 132,
      "received": 198,
      "finishReportDay": 220,
      "finishReportWkly": 0,
      "bal": 110
    }
  },
  {
    "id": "2026-09-24_A_NIGHT",
    "no": 24,
    "date": "24/09/2026",
    "isoDate": "2026-09-24",
    "week": 39,
    "regu": "A",
    "shiftType": "NIGHT",
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
        "shift": 9,
        "bantn": 1,
        "lab": 10,
        "cuti": 2,
        "alpa": 0,
        "izin": 3,
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
        "shift": 13,
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
        "shift": 21,
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
        "shift": 666,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 122,
      "epsD": 0,
      "epsE": 147,
      "epsF": 146,
      "epsG": 139,
      "epsH": 50,
      "s2Puma": 62,
      "shift": 666,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 120,
      "finishShift": 166,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 48
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
      "osExp": 702,
      "zetiumA": {
        "prod": 16,
        "exp": 59,
        "smelt": 4,
        "gts": 0,
        "rarr": 22,
        "ver": 19,
        "std": 39,
        "blank": 3,
        "total": 162,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 95,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 16,
        "std": 35,
        "blank": 4,
        "total": 151,
        "day": 0,
        "wkly": 0
      },
      "bal": 624
    },
    "qc": {
      "os": 78,
      "finishShift": 104,
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
    "id": "2026-09-25_B_DAY",
    "no": 25,
    "date": "25/09/2026",
    "isoDate": "2026-09-25",
    "week": 39,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 357,
        "day": 894,
        "wkly": 0
      },
      "prod": {
        "shift": 26,
        "rc": 2,
        "day": 40,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 36,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 357,
        "day": 894,
        "wkly": 0
      },
      "finish": {
        "shift": 401,
        "day": 1018,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 57,
      "epsD": 0,
      "epsE": 83,
      "epsF": 77,
      "epsG": 75,
      "epsH": 77,
      "s2Puma": 32,
      "shift": 401,
      "day": 1018,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 48,
      "finishShift": 169,
      "finishDay": 274,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 0,
      "w2": 0,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 624,
      "zetiumA": {
        "prod": 17,
        "exp": 61,
        "smelt": 46,
        "gts": 0,
        "rarr": 26,
        "ver": 0,
        "std": 19,
        "blank": 4,
        "total": 173,
        "day": 346,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 127,
        "smelt": 0,
        "gts": 0,
        "rarr": 18,
        "ver": 0,
        "std": 17,
        "blank": 5,
        "total": 167,
        "day": 317,
        "wkly": 0
      },
      "bal": 546
    },
    "qc": {
      "os": 130,
      "finishShift": 182,
      "finishDay": 312,
      "finishWkly": 0,
      "bal": 130
    },
    "report": {
      "osReport": 110,
      "received": 264,
      "finishReportDay": 242,
      "finishReportWkly": 0,
      "bal": 132
    }
  },
  {
    "id": "2026-09-25_A_NIGHT",
    "no": 25,
    "date": "25/09/2026",
    "isoDate": "2026-09-25",
    "week": 39,
    "regu": "A",
    "shiftType": "NIGHT",
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
        "shift": 11,
        "bantn": 0,
        "lab": 11,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 14
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 537,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 14,
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
        "shift": 36,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 537,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 617,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 110,
      "epsD": 0,
      "epsE": 118,
      "epsF": 117,
      "epsG": 111,
      "epsH": 121,
      "s2Puma": 40,
      "shift": 617,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 105,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 0
    },
    "loi": {
      "os": 0,
      "w2": 0,
      "w4": 0,
      "w5": 0,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 0
    },
    "wdxrf": {
      "osExp": 546,
      "zetiumA": {
        "prod": 29,
        "exp": 43,
        "smelt": 6,
        "gts": 0,
        "rarr": 32,
        "ver": 19,
        "std": 42,
        "blank": 2,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 82,
        "smelt": 0,
        "gts": 0,
        "rarr": 10,
        "ver": 16,
        "std": 39,
        "blank": 3,
        "total": 150,
        "day": 0,
        "wkly": 0
      },
      "bal": 416
    },
    "qc": {
      "os": 130,
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
    "id": "2026-09-26_B_DAY",
    "no": 26,
    "date": "26/09/2026",
    "isoDate": "2026-09-26",
    "week": 39,
    "regu": "B",
    "shiftType": "DAY",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 17
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 532,
        "day": 920,
        "wkly": 0
      },
      "prod": {
        "shift": 30,
        "rc": 0,
        "day": 48,
        "wkly": 0
      },
      "exp": {
        "shift": 1128,
        "day": 1128,
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
        "shift": 532,
        "day": 920,
        "wkly": 0
      },
      "finish": {
        "shift": 553,
        "day": 1115,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 91,
      "epsD": 0,
      "epsE": 103,
      "epsF": 102,
      "epsG": 94,
      "epsH": 107,
      "s2Puma": 56,
      "shift": 553,
      "day": 1115,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 188,
      "finishDay": 508,
      "finishWkly": 0,
      "balExp": 1032
    },
    "loi": {
      "os": 0,
      "w2": 182,
      "w4": 78,
      "w5": 26,
      "finLoiShift": 234,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 1196
    },
    "wdxrf": {
      "osExp": 416,
      "zetiumA": {
        "prod": 29,
        "exp": 55,
        "smelt": 51,
        "gts": 0,
        "rarr": 27,
        "ver": 0,
        "std": 13,
        "blank": 6,
        "total": 181,
        "day": 354,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 137,
        "smelt": 0,
        "gts": 0,
        "rarr": 16,
        "ver": 0,
        "std": 19,
        "blank": 0,
        "total": 172,
        "day": 341,
        "wkly": 0
      },
      "bal": 260
    },
    "qc": {
      "os": 156,
      "finishShift": 130,
      "finishDay": 286,
      "finishWkly": 0,
      "bal": 234
    },
    "report": {
      "osReport": 132,
      "received": 242,
      "finishReportDay": 220,
      "finishReportWkly": 0,
      "bal": 154
    }
  },
  {
    "id": "2026-09-26_A_NIGHT",
    "no": 26,
    "date": "26/09/2026",
    "isoDate": "2026-09-26",
    "week": 39,
    "regu": "A",
    "shiftType": "NIGHT",
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
        "shift": 11,
        "bantn": 1,
        "lab": 12,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 388,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 18,
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
        "shift": 32,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 388,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 562,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 78,
      "epsD": 0,
      "epsE": 121,
      "epsF": 119,
      "epsG": 90,
      "epsH": 117,
      "s2Puma": 37,
      "shift": 562,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 1032,
      "finishShift": 320,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 888
    },
    "loi": {
      "os": 1196,
      "w2": 208,
      "w4": 208,
      "w5": 208,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 988
    },
    "wdxrf": {
      "osExp": 260,
      "zetiumA": {
        "prod": 38,
        "exp": 40,
        "smelt": 0,
        "gts": 53,
        "rarr": 13,
        "ver": 19,
        "std": 8,
        "blank": 2,
        "total": 173,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 96,
        "smelt": 0,
        "gts": 0,
        "rarr": 12,
        "ver": 16,
        "std": 41,
        "blank": 4,
        "total": 169,
        "day": 0,
        "wkly": 0
      },
      "bal": 338
    },
    "qc": {
      "os": 234,
      "finishShift": 156,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 208
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
    "id": "2026-09-27_B_LS",
    "no": 27,
    "date": "27/09/2026",
    "isoDate": "2026-09-27",
    "week": 40,
    "regu": "B",
    "shiftType": "LS",
    "manpower": {
      "staff": {
        "shift": 6,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 10
      },
      "crew": {
        "shift": 13,
        "bantn": 0,
        "lab": 13,
        "cuti": 2,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 720,
        "day": 720,
        "wkly": 4330
      },
      "prod": {
        "shift": 30,
        "rc": 0,
        "day": 30,
        "wkly": 168
      },
      "exp": {
        "shift": 192,
        "day": 192,
        "wkly": 432
      },
      "smelter": {
        "shift": 21,
        "day": 21,
        "wkly": 88
      }
    },
    "pressPowder": {
      "received": {
        "shift": 720,
        "day": 720,
        "wkly": 4330
      },
      "finish": {
        "shift": 846,
        "day": 846,
        "wkly": 4969
      }
    },
    "edxrf": {
      "epsC": 146,
      "epsD": 0,
      "epsE": 160,
      "epsF": 156,
      "epsG": 141,
      "epsH": 179,
      "s2Puma": 64,
      "shift": 846,
      "day": 846,
      "wkly": 4969
    },
    "fuseBead": {
      "osExp": 888,
      "finishShift": 416,
      "finishDay": 416,
      "finishWkly": 1777,
      "balExp": 648
    },
    "loi": {
      "os": 988,
      "w2": 276,
      "w4": 380,
      "w5": 432,
      "finLoiShift": 432,
      "finLoiDay": 1420,
      "finLoiWkly": 0,
      "bal": 806
    },
    "wdxrf": {
      "osExp": 338,
      "zetiumA": {
        "prod": 36,
        "exp": 59,
        "smelt": 62,
        "gts": 0,
        "rarr": 37,
        "ver": 49,
        "std": 0,
        "blank": 6,
        "total": 249,
        "day": 249,
        "wkly": 1265
      },
      "zetiumB": {
        "prod": 0,
        "exp": 209,
        "smelt": 0,
        "gts": 0,
        "rarr": 16,
        "ver": 14,
        "std": 0,
        "blank": 8,
        "total": 247,
        "day": 247,
        "wkly": 1259
      },
      "bal": 494
    },
    "qc": {
      "os": 208,
      "finishShift": 286,
      "finishDay": 286,
      "finishWkly": 1222,
      "bal": 182
    },
    "report": {
      "osReport": 154,
      "received": 242,
      "finishReportDay": 0,
      "finishReportWkly": 1166,
      "bal": 396
    }
  },
  {
    "id": "2026-09-28_A_DAY",
    "no": 28,
    "date": "28/09/2026",
    "isoDate": "2026-09-28",
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
        "shift": 10,
        "bantn": 1,
        "lab": 11,
        "cuti": 3,
        "alpa": 0,
        "izin": 1,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 873,
        "day": 1495,
        "wkly": 0
      },
      "prod": {
        "shift": 20,
        "rc": 0,
        "day": 39,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
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
        "shift": 873,
        "day": 1495,
        "wkly": 0
      },
      "finish": {
        "shift": 547,
        "day": 1678,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 91,
      "epsD": 0,
      "epsE": 121,
      "epsF": 102,
      "epsG": 103,
      "epsH": 93,
      "s2Puma": 37,
      "shift": 547,
      "day": 1678,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 0,
      "finishShift": 162,
      "finishDay": 459,
      "finishWkly": 0,
      "balExp": 576
    },
    "loi": {
      "os": 806,
      "w2": 156,
      "w4": 78,
      "w5": 52,
      "finLoiShift": 312,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 780
    },
    "wdxrf": {
      "osExp": 494,
      "zetiumA": {
        "prod": 1,
        "exp": 74,
        "smelt": 39,
        "gts": 0,
        "rarr": 15,
        "ver": 19,
        "std": 44,
        "blank": 6,
        "total": 198,
        "day": 361,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 112,
        "smelt": 0,
        "gts": 0,
        "rarr": 1,
        "ver": 16,
        "std": 35,
        "blank": 4,
        "total": 168,
        "day": 331,
        "wkly": 0
      },
      "bal": 364
    },
    "qc": {
      "os": 182,
      "finishShift": 104,
      "finishDay": 234,
      "finishWkly": 0,
      "bal": 286
    },
    "report": {
      "osReport": 396,
      "received": 198,
      "finishReportDay": 572,
      "finishReportWkly": 0,
      "bal": 22
    }
  },
  {
    "id": "2026-09-28_B_NIGHT",
    "no": 28,
    "date": "28/09/2026",
    "isoDate": "2026-09-28",
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
        "lab": 13,
        "cuti": 3,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 622,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 19,
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
        "shift": 622,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 1131,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 187,
      "epsD": 0,
      "epsE": 209,
      "epsF": 202,
      "epsG": 199,
      "epsH": 222,
      "s2Puma": 112,
      "shift": 1131,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 576,
      "finishShift": 297,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 432
    },
    "loi": {
      "os": 780,
      "w2": 260,
      "w4": 234,
      "w5": 260,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 520
    },
    "wdxrf": {
      "osExp": 364,
      "zetiumA": {
        "prod": 31,
        "exp": 32,
        "smelt": 0,
        "gts": 0,
        "rarr": 39,
        "ver": 19,
        "std": 40,
        "blank": 2,
        "total": 163,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 116,
        "smelt": 0,
        "gts": 0,
        "rarr": 7,
        "ver": 16,
        "std": 19,
        "blank": 5,
        "total": 163,
        "day": 0,
        "wkly": 0
      },
      "bal": 416
    },
    "qc": {
      "os": 286,
      "finishShift": 130,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 286
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
    "id": "2026-09-29_A_DAY",
    "no": 27,
    "date": "29/09/2026",
    "isoDate": "2026-09-29",
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
        "shift": 10,
        "bantn": 2,
        "lab": 12,
        "cuti": 2,
        "alpa": 0,
        "izin": 2,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 502,
        "day": 1116,
        "wkly": 0
      },
      "prod": {
        "shift": 20,
        "rc": 1,
        "day": 37,
        "wkly": 0
      },
      "exp": {
        "shift": 0,
        "day": 0,
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
        "shift": 502,
        "day": 1116,
        "wkly": 0
      },
      "finish": {
        "shift": 519,
        "day": 1271,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 66,
      "epsD": 0,
      "epsE": 112,
      "epsF": 99,
      "epsG": 83,
      "epsH": 101,
      "s2Puma": 58,
      "shift": 519,
      "day": 1271,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 432,
      "finishShift": 248,
      "finishDay": 528,
      "finishWkly": 0,
      "balExp": 264
    },
    "loi": {
      "os": 520,
      "w2": 182,
      "w4": 208,
      "w5": 182,
      "finLoiShift": 442,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 338
    },
    "wdxrf": {
      "osExp": 416,
      "zetiumA": {
        "prod": 21,
        "exp": 60,
        "smelt": 51,
        "gts": 0,
        "rarr": 15,
        "ver": 0,
        "std": 8,
        "blank": 5,
        "total": 160,
        "day": 331,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 127,
        "smelt": 0,
        "gts": 0,
        "rarr": 11,
        "ver": 1,
        "std": 25,
        "blank": 5,
        "total": 169,
        "day": 337,
        "wkly": 0
      },
      "bal": 416
    },
    "qc": {
      "os": 286,
      "finishShift": 104,
      "finishDay": 338,
      "finishWkly": 0,
      "bal": 364
    },
    "report": {
      "osReport": 22,
      "received": 286,
      "finishReportDay": 308,
      "finishReportWkly": 0,
      "bal": 0
    }
  },
  {
    "id": "2026-09-29_B_NIGHT",
    "no": 27,
    "date": "29/09/2026",
    "isoDate": "2026-09-29",
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
        "lab": 12,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 614,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 17,
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
        "shift": 17,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 614,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 752,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 131,
      "epsD": 0,
      "epsE": 147,
      "epsF": 138,
      "epsG": 122,
      "epsH": 147,
      "s2Puma": 67,
      "shift": 752,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 264,
      "finishShift": 280,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 96
    },
    "loi": {
      "os": 338,
      "w2": 234,
      "w4": 234,
      "w5": 260,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 78
    },
    "wdxrf": {
      "osExp": 364,
      "zetiumA": {
        "prod": 21,
        "exp": 45,
        "smelt": 8,
        "gts": 0,
        "rarr": 17,
        "ver": 19,
        "std": 57,
        "blank": 4,
        "total": 171,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 87,
        "smelt": 0,
        "gts": 0,
        "rarr": 18,
        "ver": 16,
        "std": 42,
        "blank": 5,
        "total": 168,
        "day": 0,
        "wkly": 0
      },
      "bal": 494
    },
    "qc": {
      "os": 364,
      "finishShift": 234,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 260
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
    "id": "2026-09-30_A_DAY",
    "no": 28,
    "date": "30/09/2026",
    "isoDate": "2026-09-30",
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
        "shift": 9,
        "bantn": 1,
        "lab": 10,
        "cuti": 2,
        "alpa": 0,
        "izin": 3,
        "sakit": 0,
        "total": 15
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 515,
        "day": 999,
        "wkly": 0
      },
      "prod": {
        "shift": 25,
        "rc": 0,
        "day": 62,
        "wkly": 0
      },
      "exp": {
        "shift": 192,
        "day": 240,
        "wkly": 0
      },
      "smelter": {
        "shift": 0,
        "day": 24,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 515,
        "day": 999,
        "wkly": 0
      },
      "finish": {
        "shift": 478,
        "day": 1174,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 83,
      "epsD": 0,
      "epsE": 86,
      "epsF": 81,
      "epsG": 84,
      "epsH": 105,
      "s2Puma": 39,
      "shift": 478,
      "day": 1174,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 96,
      "finishShift": 140,
      "finishDay": 374,
      "finishWkly": 0,
      "balExp": 192
    },
    "loi": {
      "os": 78,
      "w2": 78,
      "w4": 78,
      "w5": 78,
      "finLoiShift": 234,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 208
    },
    "wdxrf": {
      "osExp": 494,
      "zetiumA": {
        "prod": 19,
        "exp": 87,
        "smelt": 24,
        "gts": 0,
        "rarr": 25,
        "ver": 0,
        "std": 10,
        "blank": 4,
        "total": 169,
        "day": 324,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 143,
        "smelt": 0,
        "gts": 0,
        "rarr": 3,
        "ver": 1,
        "std": 20,
        "blank": 5,
        "total": 172,
        "day": 344,
        "wkly": 0
      },
      "bal": 390
    },
    "qc": {
      "os": 260,
      "finishShift": 182,
      "finishDay": 364,
      "finishWkly": 0,
      "bal": 312
    },
    "report": {
      "osReport": 0,
      "received": 308,
      "finishReportDay": 286,
      "finishReportWkly": 0,
      "bal": 22
    }
  },
  {
    "id": "2026-09-30_B_NIGHT",
    "no": 28,
    "date": "30/09/2026",
    "isoDate": "2026-09-30",
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
        "lab": 12,
        "cuti": 4,
        "alpa": 0,
        "izin": 0,
        "sakit": 0,
        "total": 16
      }
    },
    "sampleReceived": {
      "gc": {
        "shift": 484,
        "day": 0,
        "wkly": 0
      },
      "prod": {
        "shift": 37,
        "rc": 4,
        "day": 0,
        "wkly": 0
      },
      "exp": {
        "shift": 48,
        "day": 0,
        "wkly": 0
      },
      "smelter": {
        "shift": 24,
        "day": 0,
        "wkly": 0
      }
    },
    "pressPowder": {
      "received": {
        "shift": 484,
        "day": 0,
        "wkly": 0
      },
      "finish": {
        "shift": 696,
        "day": 0,
        "wkly": 0
      }
    },
    "edxrf": {
      "epsC": 118,
      "epsD": 0,
      "epsE": 133,
      "epsF": 125,
      "epsG": 124,
      "epsH": 137,
      "s2Puma": 59,
      "shift": 696,
      "day": 0,
      "wkly": 0
    },
    "fuseBead": {
      "osExp": 192,
      "finishShift": 234,
      "finishDay": 0,
      "finishWkly": 0,
      "balExp": 120
    },
    "loi": {
      "os": 208,
      "w2": 208,
      "w4": 156,
      "w5": 156,
      "finLoiShift": 0,
      "finLoiDay": 0,
      "finLoiWkly": 0,
      "bal": 104
    },
    "wdxrf": {
      "osExp": 390,
      "zetiumA": {
        "prod": 28,
        "exp": 51,
        "smelt": 0,
        "gts": 0,
        "rarr": 17,
        "ver": 19,
        "std": 38,
        "blank": 2,
        "total": 155,
        "day": 0,
        "wkly": 0
      },
      "zetiumB": {
        "prod": 0,
        "exp": 113,
        "smelt": 0,
        "gts": 0,
        "rarr": 22,
        "ver": 16,
        "std": 17,
        "blank": 4,
        "total": 172,
        "day": 0,
        "wkly": 0
      },
      "bal": 338
    },
    "qc": {
      "os": 312,
      "finishShift": 182,
      "finishDay": 0,
      "finishWkly": 0,
      "bal": 286
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
