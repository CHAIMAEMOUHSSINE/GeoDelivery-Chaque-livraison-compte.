package com.geodelivery.optimization;

import java.util.*;

public final class TwoOptAlgorithm {
    private TwoOptAlgorithm() {}
    // Matrice symetrique GEODESIC. ROAD asymetrique necessiterait une autre formule.
    public static List<Integer> improve(List<Integer> initial,double[][] d,boolean closed) {
        List<Integer> route=new ArrayList<>(initial);
        int end=closed?route.size()-2:route.size()-1;
        for(int iteration=0;iteration<200;iteration++) {
            boolean changed=false;
            for(int i=1;i<end;i++) for(int k=i+1;k<=end;k++) {
                int a=route.get(i-1),b=route.get(i),c=route.get(k);
                double delta=d[a][c]-d[a][b];
                if(k+1<route.size()) {
                    int e=route.get(k+1); delta+=d[b][e]-d[c][e];
                }
                if(delta < -1e-9) { Collections.reverse(route.subList(i,k+1)); changed=true; }
            }
            if(!changed) break;
        }
        return route;
    }
}
